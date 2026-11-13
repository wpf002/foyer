import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// A clay doorway on espresso, same mark as icon.svg. iOS rounds the corners itself.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: '#2a231d' }}>
        <div style={{ width: 68, height: 116, marginBottom: 34, background: '#b04e28', borderRadius: '34px 34px 0 0' }} />
      </div>
    ),
    size,
  );
}
