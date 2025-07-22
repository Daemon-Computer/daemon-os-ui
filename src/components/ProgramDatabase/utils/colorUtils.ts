export function hsvToRgb(hue: number, saturation: number, value: number): [number, number, number] {
  let red = 0,
    green = 0,
    blue = 0;
  const hueSectorIndex = Math.floor(hue * 6);
  const hueFractionalPart = hue * 6 - hueSectorIndex;
  const valueScaledBySaturation = value * (1 - saturation);
  const valueScaledByFractionalSaturation = value * (1 - hueFractionalPart * saturation);
  const valueScaledByInverseFractionalSaturation =
    value * (1 - (1 - hueFractionalPart) * saturation);

  switch (hueSectorIndex % 6) {
    case 0:
      red = value;
      green = valueScaledByInverseFractionalSaturation;
      blue = valueScaledBySaturation;
      break;
    case 1:
      red = valueScaledByFractionalSaturation;
      green = value;
      blue = valueScaledBySaturation;
      break;
    case 2:
      red = valueScaledBySaturation;
      green = value;
      blue = valueScaledByInverseFractionalSaturation;
      break;
    case 3:
      red = valueScaledBySaturation;
      green = valueScaledByFractionalSaturation;
      blue = value;
      break;
    case 4:
      red = valueScaledByInverseFractionalSaturation;
      green = valueScaledBySaturation;
      blue = value;
      break;
    case 5:
      red = value;
      green = valueScaledBySaturation;
      blue = valueScaledByFractionalSaturation;
      break;
  }
  return [Math.round(red * 255), Math.round(green * 255), Math.round(blue * 255)];
}
