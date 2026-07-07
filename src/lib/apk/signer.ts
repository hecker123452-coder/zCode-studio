/**
 * APK Signer — Pure browser implementation using Web Crypto API
 *
 * Signs an APK (ZIP) file so it can be installed on Android without needing
 * Java's apksigner/jarsigner. Generates a self-signed RSA 2048-bit keypair
 * in the browser, creates the JAR signature files (MANIFEST.MF, CERT.SF,
 * CERT.RSA), and produces a signed APK.
 *
 * Output APK uses JAR signature scheme v1 (the original JAR signing).
 * Works on all Android versions for installation.
 *
 * References:
 * - https://docs.oracle.com/javase/8/docs/technotes/guides/jar/jar.html#Signature_Specification
 * - https://source.android.com/security/apksigning/v1
 */

import JSZip from 'jszip'

// ===== Types =====

interface SignResult {
  success: boolean
  apkBlob: Blob
  error?: string
}

interface StoredKey {
  privateKey: JsonWebKey
  publicKey: JsonWebKey
  certificate: Uint8Array // DER-encoded X.509 certificate
  alias: string
  createdAt: number
}

// ===== Utilities =====

async function sha256(data: ArrayBuffer | Uint8Array): Promise<ArrayBuffer> {
  let buf: ArrayBuffer
  if (data instanceof Uint8Array) {
    // Create a proper ArrayBuffer copy to avoid SharedArrayBuffer/offset issues
    buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
  } else {
    buf = data
  }
  return await crypto.subtle.digest('SHA-256', buf)
}

function base64FromArrayBuffer(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}

// ===== DER Encoding (minimal X.509 self-signed certificate) =====

const TAG_INTEGER = 0x02
const TAG_BIT_STRING = 0x03
const TAG_OCTET_STRING = 0x04
const TAG_NULL = 0x05
const TAG_OID = 0x06
const TAG_UTF8_STRING = 0x0C
const TAG_UTC_TIME = 0x17
const TAG_SEQUENCE = 0x30
const TAG_SET = 0x31

function derLength(len: number): Uint8Array {
  if (len < 0x80) return new Uint8Array([len])
  if (len < 0x100) return new Uint8Array([0x81, len])
  if (len < 0x10000) return new Uint8Array([0x82, (len >> 8) & 0xff, len & 0xff])
  throw new Error('Length too large: ' + len)
}

function derTagLength(tag: number, content: Uint8Array): Uint8Array {
  const lenBytes = derLength(content.length)
  const result = new Uint8Array(1 + lenBytes.length + content.length)
  result[0] = tag
  result.set(lenBytes, 1)
  result.set(content, 1 + lenBytes.length)
  return result
}

function derInteger(value: number | Uint8Array): Uint8Array {
  let bytes: Uint8Array
  if (typeof value === 'number') {
    if (value < 0) throw new Error('Negative integers not supported')
    if (value === 0) {
      bytes = new Uint8Array([0])
    } else {
      const temp: number[] = []
      let v = value
      while (v > 0) {
        temp.unshift(v & 0xff)
        v = v >> 8
      }
      if (temp[0] & 0x80) temp.unshift(0)
      bytes = new Uint8Array(temp)
    }
  } else {
    bytes = value
    if (bytes[0] & 0x80) {
      const padded = new Uint8Array(bytes.length + 1)
      padded.set(bytes, 1)
      bytes = padded
    }
  }
  return derTagLength(TAG_INTEGER, bytes)
}

function derOID(oid: number[]): Uint8Array {
  const bytes: number[] = [40 * oid[0] + oid[1]]
  for (let i = 2; i < oid.length; i++) {
    let v = oid[i]
    if (v < 0x80) {
      bytes.push(v)
    } else {
      const temp: number[] = []
      temp.push(v & 0x7f)
      v = v >> 7
      while (v > 0) {
        temp.unshift((v & 0x7f) | 0x80)
        v = v >> 7
      }
      bytes.push(...temp)
    }
  }
  return derTagLength(TAG_OID, new Uint8Array(bytes))
}

function derNull(): Uint8Array {
  return new Uint8Array([TAG_NULL, 0x00])
}

function derSequence(...items: Uint8Array[]): Uint8Array {
  const total = items.reduce((acc, item) => acc + item.length, 0)
  const content = new Uint8Array(total)
  let offset = 0
  for (const item of items) {
    content.set(item, offset)
    offset += item.length
  }
  return derTagLength(TAG_SEQUENCE, content)
}

function derSet(...items: Uint8Array[]): Uint8Array {
  const total = items.reduce((acc, item) => acc + item.length, 0)
  const content = new Uint8Array(total)
  let offset = 0
  for (const item of items) {
    content.set(item, offset)
    offset += item.length
  }
  return derTagLength(TAG_SET, content)
}

function derBitString(content: Uint8Array): Uint8Array {
  const padded = new Uint8Array(content.length + 1)
  padded[0] = 0x00
  padded.set(content, 1)
  return derTagLength(TAG_BIT_STRING, padded)
}

function derOctetString(content: Uint8Array): Uint8Array {
  return derTagLength(TAG_OCTET_STRING, content)
}

function derUTF8String(str: string): Uint8Array {
  return derTagLength(TAG_UTF8_STRING, stringToUint8Array(str))
}

function derUTCTime(date: Date): Uint8Array {
  const yy = String(date.getUTCFullYear() % 100).padStart(2, '0')
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  const hh = String(date.getUTCHours()).padStart(2, '0')
  const mi = String(date.getUTCMinutes()).padStart(2, '0')
  const ss = String(date.getUTCSeconds()).padStart(2, '0')
  return derTagLength(TAG_UTC_TIME, stringToUint8Array(`${yy}${mm}${dd}${hh}${mi}${ss}Z`))
}

function derExplicitTag(tagNumber: number, content: Uint8Array): Uint8Array {
  const tag = 0xA0 | tagNumber
  const lenBytes = derLength(content.length)
  const result = new Uint8Array(1 + lenBytes.length + content.length)
  result[0] = tag
  result.set(lenBytes, 1)
  result.set(content, 1 + lenBytes.length)
  return result
}

// OIDs
const OID_RSA_ENCRYPTION = [1, 2, 840, 113549, 1, 1, 1]
const OID_SHA256_WITH_RSA = [1, 2, 840, 113549, 1, 1, 11]
const OID_COMMON_NAME = [2, 5, 4, 3]
const OID_COUNTRY = [2, 5, 4, 6]
const OID_ORGANIZATION = [2, 5, 4, 10]
const OID_SIGNED_DATA = [1, 2, 840, 113549, 1, 7, 2]
const OID_DATA = [1, 2, 840, 113549, 1, 7, 1]
const OID_SHA256 = [2, 16, 840, 1, 101, 3, 4, 2, 1]

/**
 * Build a self-signed X.509 v3 certificate (DER-encoded).
 */
async function buildSelfSignedCertificate(
  publicKey: CryptoKey,
  privateKey: CryptoKey,
  subject: { cn: string; o?: string; c?: string }
): Promise<Uint8Array> {
  const spkiDer = await crypto.subtle.exportKey('spki', publicKey)
  const spkiBytes = new Uint8Array(spkiDer)

  const version = derInteger(2) // v3
  const serialNumber = derInteger(Math.floor(Math.random() * 1000000) + 1)
  const sigAlgo = derSequence(derOID(OID_SHA256_WITH_RSA), derNull())

  const subjectParts: Uint8Array[] = []
  if (subject.c) subjectParts.push(derSet(derSequence(derOID(OID_COUNTRY), derUTF8String(subject.c))))
  if (subject.o) subjectParts.push(derSet(derSequence(derOID(OID_ORGANIZATION), derUTF8String(subject.o))))
  subjectParts.push(derSet(derSequence(derOID(OID_COMMON_NAME), derUTF8String(subject.cn))))
  const name = derSequence(...subjectParts)

  const now = new Date()
  const expires = new Date()
  expires.setFullYear(now.getFullYear() + 25)
  const validity = derSequence(derUTCTime(now), derUTCTime(expires))

  const tbsCertificate = derSequence(
    version,
    serialNumber,
    sigAlgo,
    name, // issuer
    validity,
    name, // subject (self-signed)
    spkiBytes // subjectPublicKeyInfo
  )

  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    privateKey,
    tbsCertificate
  )

  const certificate = derSequence(
    tbsCertificate,
    sigAlgo,
    derBitString(new Uint8Array(signature))
  )

  return certificate
}

// ===== Key Management (IndexedDB) =====

const KEYSTORE_DB_NAME = 'zcode-apk-keystore'
const KEYSTORE_STORE = 'keys'

function openKeystoreDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(KEYSTORE_DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(KEYSTORE_STORE)) {
        db.createObjectStore(KEYSTORE_STORE, { keyPath: 'alias' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function generateKeystore(alias: string, subject: { cn: string; o?: string; c?: string }): Promise<StoredKey> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  )

  const certDer = await buildSelfSignedCertificate(keyPair.publicKey, keyPair.privateKey, subject)

  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey)
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)

  const stored: StoredKey = {
    privateKey: privateKeyJwk,
    publicKey: publicKeyJwk,
    certificate: certDer,
    alias,
    createdAt: Date.now(),
  }

  const db = await openKeystoreDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(KEYSTORE_STORE, 'readwrite')
    tx.objectStore(KEYSTORE_STORE).put(stored)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()

  return stored
}

export async function loadKeystore(alias: string): Promise<StoredKey | null> {
  const db = await openKeystoreDB()
  const result = await new Promise<StoredKey | null>((resolve, reject) => {
    const tx = db.transaction(KEYSTORE_STORE, 'readonly')
    const req = tx.objectStore(KEYSTORE_STORE).get(alias)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
  db.close()
  return result
}

export async function listKeystores(): Promise<string[]> {
  const db = await openKeystoreDB()
  const result = await new Promise<string[]>((resolve, reject) => {
    const tx = db.transaction(KEYSTORE_STORE, 'readonly')
    const req = tx.objectStore(KEYSTORE_STORE).getAllKeys()
    req.onsuccess = () => resolve(req.result as string[])
    req.onerror = () => reject(req.error)
  })
  db.close()
  return result
}

export async function deleteKeystore(alias: string): Promise<void> {
  const db = await openKeystoreDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(KEYSTORE_STORE, 'readwrite')
    tx.objectStore(KEYSTORE_STORE).delete(alias)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

async function importStoredKey(stored: StoredKey): Promise<{ privateKey: CryptoKey; certificate: Uint8Array }> {
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    stored.privateKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return { privateKey, certificate: stored.certificate }
}

// ===== APK Signing =====

/**
 * Sign an APK using JAR signature scheme v1.
 */
export async function signApk(
  zip: JSZip,
  privateKey: CryptoKey,
  certificate: Uint8Array
): Promise<Uint8Array> {
  // Step 1: Remove existing signature files
  const filesToRemove: string[] = []
  zip.forEach(path => {
    if (path.startsWith('META-INF/') && /\.(SF|RSA|DSA|EC)$/i.test(path)) {
      filesToRemove.push(path)
    }
    if (path === 'META-INF/MANIFEST.MF') {
      filesToRemove.push(path)
    }
  })
  filesToRemove.forEach(path => zip.remove(path))

  // Step 2: Build MANIFEST.MF
  const manifestLines: string[] = [
    'Manifest-Version: 1.0',
    'Created-By: ZCode Studio APK Signer (Web Crypto)',
    '',
  ]

  const filePaths: string[] = []
  zip.forEach(path => {
    if (!path.endsWith('/')) filePaths.push(path)
  })
  filePaths.sort()

  for (const path of filePaths) {
    const fileData = await zip.file(path)!.async('uint8array')
    const digest = await sha256(fileData)
    const digestBase64 = base64FromArrayBuffer(digest)

    manifestLines.push(`Name: ${path}`)
    manifestLines.push(`SHA-256-Digest: ${digestBase64}`)
    manifestLines.push('')
  }

  const manifestContent = manifestLines.join('\n')
  zip.file('META-INF/MANIFEST.MF', manifestContent)

  // Step 3: Build CERT.SF
  const sfLines: string[] = [
    'Signature-Version: 1.0',
    'Created-By: ZCode Studio APK Signer (Web Crypto)',
    'SHA-256-Digest-Manifest: ' + base64FromArrayBuffer(await sha256(stringToUint8Array(manifestContent))),
    '',
  ]

  // Parse manifest sections and hash each
  const manifestSections = manifestContent.split('\n\n')
  for (const section of manifestSections) {
    if (!section.trim()) continue
    if (section.startsWith('Manifest-Version')) continue

    const sectionWithNewline = section + '\n'
    const sectionDigest = await sha256(stringToUint8Array(sectionWithNewline))
    const nameMatch = section.match(/^Name: (.+)$/m)
    if (nameMatch) {
      sfLines.push(`Name: ${nameMatch[1]}`)
      sfLines.push(`SHA-256-Digest: ${base64FromArrayBuffer(sectionDigest)}`)
      sfLines.push('')
    }
  }

  const sfContent = sfLines.join('\n')
  zip.file('META-INF/CERT.SF', sfContent)

  // Step 4: Build CERT.RSA (PKCS#7 SignedData)
  // CRITICAL: Must include authenticatedAttributes (content type, signing time, message digest)
  // Without these, Android 7+ rejects the signature with "INSTALL_PARSE_FAILED_NO_CERTIFICATES"
  const sfBytes = stringToUint8Array(sfContent)
  const sfDigest = await sha256(sfBytes)

  // Build authenticatedAttributes
  // These are: contentType=data, signingTime=now, messageDigest=SHA256(CERT.SF)
  const OID_CONTENT_TYPE = [1, 2, 840, 113549, 1, 9, 3]
  const OID_SIGNING_TIME = [1, 2, 840, 113549, 1, 9, 5]
  const OID_MESSAGE_DIGEST = [1, 2, 840, 113549, 1, 9, 4]

  const authAttrs = derSet(
    derSequence(
      derOID(OID_CONTENT_TYPE),
      derOctetString(derOID(OID_DATA))
    ),
    derSequence(
      derOID(OID_SIGNING_TIME),
      derOctetString(derUTCTime(new Date()))
    ),
    derSequence(
      derOID(OID_MESSAGE_DIGEST),
      derOctetString(derOctetString(new Uint8Array(sfDigest)))
    )
  )

  // When authenticatedAttributes are present, the signature is computed over
  // the DER encoding of the authAttrs (with IMPLICIT [0] tag instead of SET tag)
  // See RFC 5652 Section 5.4
  const authAttrsForSigning = new Uint8Array(authAttrs.length)
  authAttrsForSigning.set(authAttrs)
  // Replace SET tag (0x31) with context [0] IMPLICIT tag (0xA0)
  authAttrsForSigning[0] = 0xA0

  const rsaSignature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    privateKey,
    authAttrsForSigning
  )

  // Build PKCS#7 SignedData with authenticatedAttributes
  const pkcs7 = buildPkcs7SignedData(
    new Uint8Array(rsaSignature),
    certificate,
    authAttrs
  )
  zip.file('META-INF/CERT.RSA', pkcs7)

  // Step 5: Generate APK
  const apkBytes = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  return apkBytes
}

/**
 * Build a PKCS#7 SignedData structure (RFC 5652) with authenticatedAttributes.
 */
function buildPkcs7SignedData(
  signature: Uint8Array,
  certificate: Uint8Array,
  authAttrs: Uint8Array
): Uint8Array {
  // SignerInfo ::= SEQUENCE {
  //   version INTEGER,
  //   issuerAndSerialNumber IssuerAndSerialNumber,
  //   digestAlgorithm AlgorithmIdentifier,
  //   authenticatedAttributes [0] IMPLICIT Attributes,
  //   digestEncryptionAlgorithm AlgorithmIdentifier,
  //   encryptedDigest OCTET STRING
  // }
  const signerInfo = derSequence(
    derInteger(1), // version
    derSequence(
      derSequence(), // empty issuer
      derInteger(1)  // serial
    ),
    derSequence(derOID(OID_SHA256), derNull()),
    derExplicitTag(0, authAttrs), // [0] IMPLICIT authenticatedAttributes
    derSequence(derOID(OID_SHA256_WITH_RSA), derNull()),
    derOctetString(signature)
  )

  // SignedData ::= SEQUENCE {
  //   version INTEGER,
  //   digestAlgorithms SET OF AlgorithmIdentifier,
  //   contentInfo ContentInfo,
  //   certificates [0] IMPLICIT SET OF Certificate OPTIONAL,
  //   signerInfos SET OF SignerInfo
  // }
  const signedData = derSequence(
    derInteger(1), // version
    derSet(derSequence(derOID(OID_SHA256), derNull())),
    derSequence(derOID(OID_DATA)), // contentInfo
    certificate, // certificates
    derSet(signerInfo)
  )

  // ContentInfo ::= SEQUENCE { contentType OID, content [0] EXPLICIT ANY }
  const contentInfo = derSequence(
    derOID(OID_SIGNED_DATA),
    derExplicitTag(0, signedData)
  )

  return contentInfo
}

// ===== Main Export =====

export async function signAndDownloadApk(
  zip: JSZip,
  keystoreAlias: string
): Promise<SignResult> {
  try {
    let stored = await loadKeystore(keystoreAlias)
    if (!stored) {
      stored = await generateKeystore(keystoreAlias, {
        cn: 'ZCode Studio',
        o: 'ZCode',
        c: 'ID',
      })
    }

    const { privateKey, certificate } = await importStoredKey(stored)
    const signedBytes = await signApk(zip, privateKey, certificate)

    return {
      success: true,
      apkBlob: new Blob([signedBytes as BlobPart], { type: 'application/vnd.android.package-archive' }),
    }
  } catch (err) {
    console.error('APK signing failed:', err)
    return {
      success: false,
      apkBlob: new Blob(),
      error: err instanceof Error ? err.message : 'Unknown signing error',
    }
  }
}
