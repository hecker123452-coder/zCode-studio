/**
 * AXML Decoder — Android Binary XML to readable XML
 *
 * AndroidManifest.xml and other XML files in APKs are stored in
 * Android Binary XML format (AXML), not plain text. This decoder
 * converts them back to readable XML.
 *
 * Reference: https://justanapplication.wordpress.com/2011/09/22/android-internals-binary-xml-file-format/
 */

interface StringPool {
  strings: string[]
}

interface ResourceMap {
  ids: number[]
}

const CHUNK_AXML_FILE = 0x00080003
const CHUNK_STRING_POOL = 0x001c0001
const CHUNK_RESOURCE_IDS = 0x00080180
const CHUNK_XML_START_NAMESPACE = 0x00100100
const CHUNK_XML_END_NAMESPACE = 0x00100101
const CHUNK_XML_START_TAG = 0x00100102
const CHUNK_XML_END_TAG = 0x00100103
const CHUNK_XML_CDATA = 0x00100104

const ATTRIBUTE_TYPE_NULL = 0x00
const ATTRIBUTE_TYPE_REFERENCE = 0x01
const ATTRIBUTE_TYPE_ATTRIBUTE = 0x02
const ATTRIBUTE_TYPE_STRING = 0x03
const ATTRIBUTE_TYPE_FLOAT = 0x04
const ATTRIBUTE_TYPE_DIMENSION = 0x05
const ATTRIBUTE_TYPE_FRACTION = 0x06
const ATTRIBUTE_TYPE_INT_DEC = 0x10
const ATTRIBUTE_TYPE_INT_HEX = 0x11
const ATTRIBUTE_TYPE_INT_BOOL = 0x12
const ATTRIBUTE_TYPE_INT_COLOR_ARGB8 = 0x1c
const ATTRIBUTE_TYPE_INT_COLOR_RGB8 = 0x1d
const ATTRIBUTE_TYPE_INT_COLOR_ARGB4 = 0x1e
const ATTRIBUTE_TYPE_INT_COLOR_RGB4 = 0x1f

function readUint32(data: Uint8Array, offset: number): number {
  return (data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)) >>> 0
}

function readUint16(data: Uint8Array, offset: number): number {
  return (data[offset] | (data[offset + 1] << 8)) >>> 0
}

function readInt32(data: Uint8Array, offset: number): number {
  return data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)
}

function decodeUTF16(data: Uint8Array, offset: number, length: number): string {
  let str = ''
  for (let i = 0; i < length; i++) {
    const code = readUint16(data, offset + i * 2)
    str += String.fromCharCode(code)
  }
  return str
}

function parseStringPool(data: Uint8Array, offset: number): StringPool {
  const stringCount = readUint32(data, offset + 8)
  const styleCount = readUint32(data, offset + 12)
  const flags = readUint32(data, offset + 16)
  const stringsStart = readUint32(data, offset + 20)
  const stylesStart = readUint32(data, offset + 24)
  const isUTF8 = (flags & 0x100) !== 0

  const strings: string[] = []
  const stringOffsets: number[] = []

  for (let i = 0; i < stringCount; i++) {
    stringOffsets.push(readUint32(data, offset + 28 + i * 4))
  }

  for (let i = 0; i < stringCount; i++) {
    const strOffset = offset + stringsStart + stringOffsets[i]
    if (isUTF8) {
      // UTF-8: first byte = length (or 2 bytes if > 127)
      let len = data[strOffset]
      let actualOffset = strOffset + 1
      if (len & 0x80) {
        len = ((len & 0x7f) << 8) | data[strOffset + 1]
        actualOffset = strOffset + 2
      }
      // Skip the "decoded length" byte
      let decodedLen = data[actualOffset]
      actualOffset++
      if (decodedLen & 0x80) {
        decodedLen = ((decodedLen & 0x7f) << 8) | data[actualOffset]
        actualOffset++
      }
      strings.push(new TextDecoder().decode(data.slice(actualOffset, actualOffset + decodedLen)))
    } else {
      // UTF-16
      let len = readUint16(data, strOffset)
      let actualOffset = strOffset + 2
      if (len & 0x8000) {
        len = ((len & 0x7fff) << 16) | readUint16(data, strOffset + 2)
        actualOffset = strOffset + 4
      }
      strings.push(decodeUTF16(data, actualOffset, len))
    }
  }

  return { strings }
}

function parseResourceMap(data: Uint8Array, offset: number): ResourceMap {
  const size = readUint32(data, offset + 4)
  const count = (size - 8) / 4
  const ids: number[] = []
  for (let i = 0; i < count; i++) {
    ids.push(readUint32(data, offset + 8 + i * 4))
  }
  return { ids }
}

function getAttributeTypeName(type: number, value: number): string {
  switch (type) {
    case ATTRIBUTE_TYPE_STRING: return null as any // handled by caller
    case ATTRIBUTE_TYPE_INT_DEC: return value.toString()
    case ATTRIBUTE_TYPE_INT_HEX: return '0x' + value.toString(16)
    case ATTRIBUTE_TYPE_INT_BOOL: return value === 0 ? 'false' : 'true'
    case ATTRIBUTE_TYPE_REFERENCE: return '@' + (value >>> 0).toString(16)
    case ATTRIBUTE_TYPE_ATTRIBUTE: return '?' + (value >>> 0).toString(16)
    case ATTRIBUTE_TYPE_FLOAT: {
      const buf = new ArrayBuffer(4)
      new DataView(buf).setUint32(0, value >>> 0, true)
      return new DataView(buf).getFloat32(0, true).toString()
    }
    case ATTRIBUTE_TYPE_DIMENSION: {
      const unit = value & 0x0f
      const val = value >>> 4
      const units = ['px', 'dip', 'sp', 'pt', 'in', 'mm']
      return val + (units[unit] || '')
    }
    case ATTRIBUTE_TYPE_FRACTION: {
      const type2 = value & 0x0f
      const val = (value >>> 4) / 1000
      return val + (type2 === 0 ? '%' : '%p')
    }
    case ATTRIBUTE_TYPE_INT_COLOR_ARGB8:
    case ATTRIBUTE_TYPE_INT_COLOR_RGB8:
    case ATTRIBUTE_TYPE_INT_COLOR_ARGB4:
    case ATTRIBUTE_TYPE_INT_COLOR_RGB4:
      return '#' + (value >>> 0).toString(16).padStart(8, '0')
    default: return null as any
  }
}

export function decodeAXML(data: Uint8Array): string {
  if (data.length < 8) return '<!-- Invalid AXML: too short -->'
  if (readUint16(data, 0) !== 3 && readUint16(data, 2) !== 8) {
    // Not AXML — return as-is if it's plain text
    try {
      const text = new TextDecoder().decode(data)
      if (text.startsWith('<?xml') || text.startsWith('<')) return text
    } catch { /* ignore */ }
    return '<!-- Not a valid AXML file -->'
  }

  let stringPool: StringPool | null = null
  let resourceMap: ResourceMap | null = null
  let output = '<?xml version="1.0" encoding="utf-8"?>\n'
  const namespaceStack: Array<{ prefix: string; uri: string }> = []
  let indentLevel = 0

  function indent(): string {
    return '  '.repeat(indentLevel)
  }

  let offset = 0
  const fileSize = readUint32(data, 4)

  while (offset < fileSize && offset < data.length - 8) {
    const chunkType = readUint16(data, offset + 2)
    const chunkSize = readUint32(data, offset + 4)

    if (chunkSize < 8 || offset + chunkSize > data.length) break

    switch (chunkType) {
      case CHUNK_STRING_POOL:
        stringPool = parseStringPool(data, offset)
        break

      case CHUNK_RESOURCE_IDS:
        resourceMap = parseResourceMap(data, offset)
        break

      case CHUNK_XML_START_NAMESPACE: {
        if (stringPool) {
          const prefix = stringPool.strings[readUint32(data, offset + 16)] || ''
          const uri = stringPool.strings[readUint32(data, offset + 20)] || ''
          namespaceStack.push({ prefix, uri })
        }
        break
      }

      case CHUNK_XML_END_NAMESPACE: {
        namespaceStack.pop()
        break
      }

      case CHUNK_XML_START_TAG: {
        if (!stringPool) break

        const nameIdx = readUint32(data, offset + 16)
        const tagName = stringPool.strings[nameIdx] || `@${nameIdx}`

        const attrStart = readUint16(data, offset + 20)
        const attrSize = readUint16(data, offset + 22)
        const attrCount = readUint16(data, offset + 24)

        let attrStr = ''

        for (let i = 0; i < attrCount; i++) {
          const attrOffset = offset + attrStart + i * attrSize

          const nsIdx = readUint32(data, attrOffset)
          const nameAttrIdx = readUint32(data, attrOffset + 4)
          const valueIdx = readUint32(data, attrOffset + 8)
          const type = data[attrOffset + 15]
          const value = readInt32(data, attrOffset + 16)

          const attrName = stringPool.strings[nameAttrIdx] || `@${nameAttrIdx}`
          const nsPrefix = nsIdx !== 0xffffffff ? stringPool.strings[nsIdx] : null

          let attrValue: string | null = null

          if (valueIdx !== 0xffffffff && stringPool.strings[valueIdx]) {
            attrValue = stringPool.strings[valueIdx]
          } else {
            attrValue = getAttributeTypeName(type, value)
          }

          if (attrValue === null) attrValue = ''

          const fullAttrName = nsPrefix
            ? `${nsPrefix.split('/').pop()}:${attrName}`
            : attrName

          // Escape attribute value
          const escapedValue = attrValue
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')

          attrStr += ` ${fullAttrName}="${escapedValue}"`
        }

        output += `${indent()}<${tagName}${attrStr}>\n`
        indentLevel++
        break
      }

      case CHUNK_XML_END_TAG: {
        if (!stringPool) break
        indentLevel = Math.max(0, indentLevel - 1)
        const nameIdx = readUint32(data, offset + 16)
        const tagName = stringPool.strings[nameIdx] || `@${nameIdx}`
        output += `${indent()}</${tagName}>\n`
        break
      }

      case CHUNK_XML_CDATA: {
        if (stringPool) {
          const dataIdx = readUint32(data, offset + 16)
          const cdata = stringPool.strings[dataIdx] || ''
          if (cdata.trim()) {
            output += `${indent()}${cdata}\n`
          }
        }
        break
      }
    }

    offset += chunkSize
  }

  return output
}

/**
 * Extract key info from AndroidManifest.xml (decoded)
 */
export interface ApkManifestInfo {
  package?: string
  versionName?: string
  versionCode?: string
  minSdk?: string
  targetSdk?: string
  permissions: string[]
  activities: string[]
  services: string[]
  receivers: string[]
}

export function parseManifestInfo(manifestXml: string): ApkManifestInfo {
  const info: ApkManifestInfo = {
    permissions: [],
    activities: [],
    services: [],
    receivers: [],
  }

  // Extract package
  const pkgMatch = manifestXml.match(/package="([^"]+)"/)
  if (pkgMatch) info.package = pkgMatch[1]

  // Extract versionName
  const versionNameMatch = manifestXml.match(/android:versionName="([^"]+)"/)
  if (versionNameMatch) info.versionName = versionNameMatch[1]

  // Extract versionCode
  const versionCodeMatch = manifestXml.match(/android:versionCode="([^"]+)"/)
  if (versionCodeMatch) info.versionCode = versionCodeMatch[1]

  // Extract minSdk
  const minSdkMatch = manifestXml.match(/android:minSdkVersion="([^"]+)"/)
  if (minSdkMatch) info.minSdk = minSdkMatch[1]

  // Extract targetSdk
  const targetSdkMatch = manifestXml.match(/android:targetSdkVersion="([^"]+)"/)
  if (targetSdkMatch) info.targetSdk = targetSdkMatch[1]

  // Extract permissions
  const permRegex = /android:name="([^"]*\.permission\.[^"]+)"/g
  let permMatch
  while ((permMatch = permRegex.exec(manifestXml))) {
    if (!info.permissions.includes(permMatch[1])) {
      info.permissions.push(permMatch[1])
    }
  }

  // Extract activities
  const activityRegex = /<activity[^>]*android:name="([^"]+)"/g
  while ((permMatch = activityRegex.exec(manifestXml))) {
    info.activities.push(permMatch[1])
  }

  // Extract services
  const serviceRegex = /<service[^>]*android:name="([^"]+)"/g
  while ((permMatch = serviceRegex.exec(manifestXml))) {
    info.services.push(permMatch[1])
  }

  // Extract receivers
  const receiverRegex = /<receiver[^>]*android:name="([^"]+)"/g
  while ((permMatch = receiverRegex.exec(manifestXml))) {
    info.receivers.push(permMatch[1])
  }

  return info
}

/**
 * Extract basic info from a DEX file
 */
export interface DexInfo {
  version: string
  stringCount: number
  classCount: number
  methodCount: number
  fieldCount: number
  fileSize: number
  topStrings: string[]
}

export function parseDexInfo(data: Uint8Array): DexInfo {
  const info: DexInfo = {
    version: 'unknown',
    stringCount: 0,
    classCount: 0,
    methodCount: 0,
    fieldCount: 0,
    fileSize: data.length,
    topStrings: [],
  }

  if (data.length < 112) return info

  // Check DEX magic
  if (data[0] === 0x64 && data[1] === 0x65 && data[2] === 0x78) {
    // "dex\n"
    const versionByte = data[6]
    if (versionByte === 0x30) info.version = 'Dex 035'
    else if (versionByte === 0x31) info.version = 'Dex 036'
    else if (versionByte === 0x32) info.version = 'Dex 037'
    else if (versionByte === 0x33) info.version = 'Dex 038'
    else if (versionByte === 0x34) info.version = 'Dex 039'
    else info.version = 'Dex ' + String.fromCharCode(versionByte)
  }

  // DEX header fields (little-endian uint32)
  info.stringCount = readUint32(data, 56)
  // class_defs_size at offset 96
  info.classCount = readUint32(data, 96)
  // method_ids_size at offset 88
  info.methodCount = readUint32(data, 88)
  // field_ids_size at offset 80
  info.fieldCount = readUint32(data, 80)

  // Try to extract some strings (first 20)
  try {
    const stringIdsOff = readUint32(data, 60)
    const strings: string[] = []
    const maxStrings = Math.min(info.stringCount, 20)

    for (let i = 0; i < maxStrings; i++) {
      const strIdOff = stringIdsOff + i * 4
      if (strIdOff + 4 > data.length) break
      const strDataOff = readUint32(data, strIdOff)
      if (strDataOff + 4 > data.length) continue

      // Read ULEB128 length
      let len = 0
      let shift = 0
      let off = strDataOff
      while (off < data.length) {
        const b = data[off++]
        len |= (b & 0x7f) << shift
        if ((b & 0x80) === 0) break
        shift += 7
      }

      // Read MUTF-8 string (simplified — just take ASCII chars)
      let str = ''
      const maxLen = Math.min(len, 100)
      for (let j = 0; j < maxLen && off + j < data.length; j++) {
        const c = data[off + j]
        if (c === 0) break
        if (c >= 32 && c < 127) str += String.fromCharCode(c)
        else str += '?'
      }
      if (str.length > 3) strings.push(str)
    }
    info.topStrings = strings.filter(s => !s.includes('????'))
  } catch { /* ignore */ }

  return info
}
