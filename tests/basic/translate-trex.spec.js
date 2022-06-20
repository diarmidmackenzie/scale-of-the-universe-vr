// @ts-check
const { test, expect } = require('@playwright/test');

// This allows aframe-e2e-testing exports to be used inside arame-e2e-testing itself.
// Not required when aframe-e2e-testing is imported as a dependency (in which case it will be 
// accessed via node_modules).
module.paths.push(`${module.path}/../..`)

const { A } = require('aframe-e2e-testing');

const slowMotion = false;

test('Translate T-Rex - in VR', async ({ page }) => {

  A.setPage(page);

  await page.goto('127.0.0.1:8080/trex.html');

  // Enter VR
  await A.enterVR()
  
  // Set position of right and left hands.
  await A.setEntityPosition('#lhand', -0.5, 1, -1)
  await A.setEntityPosition('#rhand', 0.5, 1, -1)
  
  // Check initial position of T-Rex
  var getPosition = async () => (await A.getEntityWorldPosition('#trex'));
  await expect(getPosition).toReturn({x: -3, y: 0, z: -4}, {dps: 8})
  
  if (slowMotion) await page.waitForTimeout(1000);

  // point controller at T-Rex.  Origin of T-Rex model is right at the bottom.
  // Aim a little higher to get a reliable raycast contact.
  await A.pointControllerAt('#rhand', '#trex', 'oculus-touch-v3', {x: 0, y: 50, z: 0})

  // Pause needed for raycasting to occur.
  // Could be replaced by awaiting some visible hover indication, if we had one.
  await page.waitForTimeout(1000);

  await A.fireCustomEvent('#rhand', 'triggerdown')  

  if (slowMotion) await page.waitForTimeout(1000);

  // move right hand 50cm to the right.
  await A.setEntityPosition('#rhand', 1.0, 1, -1)

  getPosition = async () => (await A.getEntityWorldPosition('#trex'));
  await expect(getPosition).toReturn({x: -2.5, y: 0, z: -4}, {dps: 8})

  await A.fireCustomEvent('#rhand', 'triggerup');
  
  getPosition = async () => (await A.getEntityWorldPosition('#trex'));
  await expect(getPosition).toReturn({x: -2.5, y: 0, z: -4}, {dps: 8})

  if (slowMotion) await page.waitForTimeout(1000);

/*  position = await A.getEntityPosition('#trex')
  expect(position.x).toBeApprox(-2.5)
  expect(position.y).toBeApprox(-1)
  expect(position.z).toBeApprox(-0)*/
  
  // Exit VR
  await A.exitVR('#lhand', '#rhand')

});
