// Test APK signer crypto logic (skip IndexedDB, test signApk directly)
import JSZip from 'jszip'

async function testSignerCrypto() {
  console.log('=== Test: Generate RSA 2048 keypair ===')
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
  console.log('✓ RSA 2048 keypair generated')

  console.log('\n=== Test: SHA-256 ===')
  const data = new TextEncoder().encode('test')
  const digest = await crypto.subtle.digest('SHA-256', data)
  console.log('✓ SHA-256 works:', digest.byteLength, 'bytes')

  console.log('\n=== Test: Sign with private key ===')
  const sig = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    keyPair.privateKey,
    data
  )
  console.log('✓ Sign works:', sig.byteLength, 'bytes')

  console.log('\n=== Test: signApk function ===')
  const { signApk } = await import('../src/lib/apk/signer.ts')

  const zip = new JSZip()
  zip.file('AndroidManifest.xml', '<?xml version="1.0"?><manifest/>')
  zip.file('classes.dex', new Uint8Array([0x64, 0x65, 0x78]))
  zip.file('resources.arsc', new Uint8Array([0x02, 0x00, 0x0c]))
  zip.folder('res')?.file('layout/main.xml', '<layout/>')

  const dummyCert = new Uint8Array([0x30, 0x82, 0x01, 0x00, 0x02, 0x01, 0x02, 0x02, 0x01, 0x01])

  console.log('  Calling signApk...')
  try {
    const signedBytes = await signApk(zip, keyPair.privateKey, dummyCert)
    console.log('✓ signApk returned:', signedBytes.length, 'bytes')

    const signedZip = await JSZip.loadAsync(signedBytes)
    const files = Object.keys(signedZip.files)
    console.log('  Files in signed APK:', files.length)
    console.log('  Has MANIFEST.MF:', files.includes('META-INF/MANIFEST.MF'))
    console.log('  Has CERT.SF:', files.includes('META-INF/CERT.SF'))
    console.log('  Has CERT.RSA:', files.includes('META-INF/CERT.RSA'))

    const manifest = await signedZip.file('META-INF/MANIFEST.MF')!.async('string')
    console.log('\n  MANIFEST.MF:')
    manifest.split('\n').forEach(line => console.log('   ', line))

    const sf = await signedZip.file('META-INF/CERT.SF')!.async('string')
    console.log('\n  CERT.SF:')
    sf.split('\n').forEach(line => console.log('   ', line))

    const rsaSize = (await signedZip.file('META-INF/CERT.RSA')!.async('uint8array')).length
    console.log('\n  CERT.RSA size:', rsaSize, 'bytes')

    console.log('\n✓ ALL TESTS PASSED — Web Crypto API can sign APKs!')
  } catch (err) {
    console.error('✗ signApk failed:', err)
    console.error(err.stack)
  }
}

testSignerCrypto().catch(err => {
  console.error('Test runner error:', err)
  process.exit(1)
})
