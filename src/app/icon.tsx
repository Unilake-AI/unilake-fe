import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { ImageResponse } from 'next/og'

export const size = { width: 64, height: 64 }
export const contentType = 'image/png'

export default async function Icon() {
  const logo = await readFile(join(process.cwd(), 'public', 'logo.png'), 'base64')

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        borderRadius: 14,
      }}
    >
      <img
        src={`data:image/png;base64,${logo}`}
        width={112}
        height={112}
        alt=""
        style={{ flexShrink: 0 }}
      />
    </div>,
    size
  )
}
