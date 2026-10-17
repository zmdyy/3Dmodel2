// Paraxial thin lenses; lengths in cm, angles as slopes, power in cm^-1.
// Object x=-u, corrector x=-d, original lens x=0, screen x=s.
export function lensSystem(u, f, d = 0, power = 0) {
  const a = u - d;
  const A = 1 - d * power;
  const B = a * A + d;
  const C = -power - A / f;
  const D = 1 - a * power - B / f;
  if (Math.abs(D) < 1e-10) return { A,B,C,D,v:Infinity,m:Infinity,kind:'none' };
  const v = -B / D;
  const m = A + v * C;
  return { A,B,C,D,v,m,kind:v>0?'real':'virtual' };
}
export function powerForScreen(u, f, d, screen) {
  const k = 1 - screen / f;
  return (u * k + screen) / ((u-d) * (d*k+screen));
}
export function traceRay(u, f, d, power, height, slope, endX) {
  const y1 = height + (u-d)*slope;
  const t1 = slope - power*y1;
  const y2 = y1 + d*t1;
  const t2 = t1 - y2/f;
  return [[-u,height],[-d,y1],[0,y2],[endX,y2+endX*t2]];
}
// Shoot from an object point toward a chosen height at the original aperture.
export function apertureRay(u, f, d, power, height, apertureHeight, endX) {
  const sys = lensSystem(u,f,d,power);
  const slope = (apertureHeight-sys.A*height)/sys.B;
  return traceRay(u,f,d,power,height,slope,endX);
}
