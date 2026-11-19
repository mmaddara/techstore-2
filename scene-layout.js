import * as T from './assets/vendor/three.module.js';

// Fit actual rotated bounds into three separate screen regions, including depth.
export function projectedBounds(model, bounds, camera, width, height) {
  model.updateMatrixWorld(true);
  const world = new T.Box3();
  let left=Infinity, right=-Infinity, top=Infinity, bottom=-Infinity;
  for (const local of bounds) {
    const point=local.clone().applyMatrix4(model.matrixWorld);world.expandByPoint(point);point.project(camera);
    const px=(point.x+1)*width/2, py=(1-point.y)*height/2;
    left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);bottom=Math.max(bottom,py);
  }
  return {left,right,top,bottom,width:right-left,height:bottom-top,world};
}

export function fitStage(models, bounds, camera, width, height, active) {
  const mobile=width<=768,others=Object.keys(models).filter(key=>key!==active);
  const metrics={};
  const gap=Math.max(16,width*.027),margin=width*.045;
  for (const key of [active,...others]) {
    const model=models[key];
    const selected=key===active;
    const side=others.indexOf(key);
    const region=selected?{left:width*.285,right:width*.715}:side===0?{left:margin,right:metrics[active].left-gap}:{left:metrics[active].right+gap,right:width-margin};
    const maxWidth=region.right-region.left;
    const maxHeight=height*(mobile?(selected?.30:.18):(selected?.50:.36));
    const baseline=height*(mobile?.62:.73),center=(region.left+region.right)/2;
    model.position.set(0,0,selected?.35:-.65);
    model.scale.setScalar(selected?1:.8);
    // Perspective changes a little when an object moves sideways or vertically.
    for (let iteration=0;iteration<6;iteration++) {
      let box=projectedBounds(model,bounds[key],camera,width,height);
      const fit=Math.min(1,maxWidth/box.width,maxHeight/box.height);
      model.scale.multiplyScalar(fit*.998);
      box=projectedBounds(model,bounds[key],camera,width,height);
      const unit=2*Math.tan(T.MathUtils.degToRad(camera.fov/2))*(camera.position.z-model.position.z)/height;
      model.position.x+=(center-(box.left+box.right)/2)*unit;
      model.position.y+=(box.bottom-baseline)*unit;
      model.updateMatrixWorld(true);
      const world=projectedBounds(model,bounds[key],camera,width,height).world;
      model.position.y+=Math.max(0,-1.72-world.min.y);
    }
    metrics[key]=projectedBounds(model,bounds[key],camera,width,height);
  }
  return metrics;
}
