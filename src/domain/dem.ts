/** Terrarium carries bathymetry: without flattening, oceans sink into trenches and ships sail underwater */
export function clampBathymetry(rgba: Uint8ClampedArray) {
  for (let i = 0; i < rgba.length; i += 4) if (rgba[i] < 128) { rgba[i] = 128; rgba[i + 1] = 0; rgba[i + 2] = 0; }
  return rgba;
}
