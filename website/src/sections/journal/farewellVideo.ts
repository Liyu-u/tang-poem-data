// First-frame SIFT registration to theme-farewell-v2.png: 317 RANSAC inliers,
// 0.24 source-pixel RMS error. The video is a horizontal crop, not the full image.
export const farewellVideoRegistration = {
  width: 1280, height: 720, referenceWidth: 408,
  scale: .31876303645568327, x: -.190442254475041, y: 146.0622572421817,
};

export function farewellVideoBounds(art: { x: number; y: number; width: number }) {
  const registration = farewellVideoRegistration;
  const scale = art.width / registration.referenceWidth;
  return {
    x: art.x + registration.x * scale,
    y: art.y + registration.y * scale,
    width: registration.width * registration.scale * scale,
    height: registration.height * registration.scale * scale,
  };
}
