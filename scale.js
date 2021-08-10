AFRAME.registerComponent('scalable', {
  schema: {
    // I haven't really understood this.
    // Centering on origin works fine.  Centering on camera doesn't work.
    // !! Need to look at the code & logic again and simplify/correct this.
    center:   {type: 'selector', default: "#camera"},
  },

  init: function() {

    // The speed at which we scale in/out.
    // This is a rate per second.  Take a root of this to get a scaling factor.
    this.scaleSpeed = 10;

    // vector used for calculating re-centering
    this.vectorFromCenter = new THREE.Vector3();

    // vector used for calculating object scales
    this.checkScale = new THREE.Vector3();

    // listeners for scaling events (key presses)
    this.listeners = {
      'scaleOut' : this.scaleOutEvent.bind(this),
      'scaleIn' : this.scaleInEvent.bind(this)
    }
    this.el.addEventListener("scale-out", this.listeners.scaleOut);
    this.el.addEventListener("scale-in", this.listeners.scaleIn);

  },

  update: function () {
    this.center = this.data.center;
    this.adjustChildrenVisibility();
  },

  // listener for scale out event
  scaleInEvent: function() {
    // scale in as if 100 msecs have passed.
    this.scaleIn(100);
  },

  scaleOutEvent: function() {
    // scale out as if 100 msecs have passed.
    this.scaleOut(100);
  },

  scaleOut: function(timeDelta) {

    const scalar = Math.pow(this.scaleSpeed, timeDelta/1000);
    this.el.object3D.scale.multiplyScalar(scalar);

    // adjust center.
    this.vectorFromCenter.subVectors(this.el.object3D.position,
                                   this.center.object3D.position);
    this.vectorFromCenter.multiplyScalar(scalar);
    this.el.object3D.position.addVectors(this.center.object3D.position,
                                         this.vectorFromCenter);
    this.adjustChildrenVisibility();
  },

  // listener for scale in event
  scaleIn: function(timeDelta) {
    const scalar = Math.pow(this.scaleSpeed, timeDelta/1000);
    this.el.object3D.scale.divideScalar(scalar);

    // adjust center.
    this.vectorFromCenter.subVectors(this.el.object3D.position,
                                   this.center.object3D.position);
    this.vectorFromCenter.divideScalar(scalar);
    this.el.object3D.position.addVectors(this.center.object3D.position,
                                         this.vectorFromCenter);
    this.adjustChildrenVisibility();
  },

  // Once object world scale is below 1 in 1M, we cull it.
  // could be smarter and actually use the bounding sphere of the object
  // but not trivial to find it, and don't want to repeat this every time
  // we zoom in / out.
  // rough logic would be:
  // from the Object3D, traverse children until we find one of type = 'Mesh'
  // Whenever we find one of type 'Mesh', get the geometry, and the bounding
  // sphere from that.
  // Iterate through all such objects and find the largest radius.
  // Use this to compute whether or not to display the element.
  adjustChildrenVisibility: function () {

    for (child of this.el.children) {
      child.object3D.getWorldScale(this.checkScale)

      if (this.checkScale.x < 0.000001) {
        child.object3D.visible = false;
      }
      else
      {
        child.object3D.visible = true;
      }
    }
  },


  tick: function(time, timeDelta) {

    // if we are in a scaling in or out state, execute the scaling.
    if (this.el.is("scaling-in")) {
      this.scaleIn(timeDelta);
    }
    else if (this.el.is("scaling-out")) {
      this.scaleOut(timeDelta);
    }
  }
});

// Displays a scale ruler of appropriate length, based on the scale of
// the "target" object.
AFRAME.registerComponent('scale-ruler', {
  schema: {
    target:   {type: 'selector'},
  },

  init: function() {
    // scale consists of:
    // 1. Text indicating 1:N or N:1 scale.
    this.text = document.createElement('a-text');
    this.text.setAttribute('position', '0 -0.15 0')
    this.text.setAttribute('scale', '0.5 0.5 0.5')
    this.text.setAttribute('value', '1:1')
    this.text.setAttribute('color', 'grey')
    this.text.setAttribute('align', 'center')
    this.el.appendChild(this.text);

    // 2. Ruler that is 1m, 10m etc. in length.
    this.ruler = document.createElement('a-box');
    this.ruler.setAttribute('height', '0.1')
    this.ruler.setAttribute('depth', '0.05')
    this.ruler.setAttribute('width', '1')
    this.ruler.setAttribute('position', '0 0 0')
    this.ruler.setAttribute('color', 'grey')
    this.ruler.setAttribute('metalness', '0.8')
    this.el.appendChild(this.ruler);

    // 3. Writing on the ruler.
    this.rulerText = document.createElement('a-text');
    this.rulerText.setAttribute('position', '0 0 0.025')
    this.rulerText.setAttribute('zOffset', '0.00001')
    this.rulerText.setAttribute('value', '1 meter')
    this.rulerText.setAttribute('color', 'black')
    this.rulerText.setAttribute('scale', '0.2 0.2 0.2')
    this.rulerText.setAttribute('align', 'center')
    this.ruler.appendChild(this.rulerText);

  },


  update: function () {
    this.target = this.data.target;
    this.render();
  },

  // if we are in a scaling in or out state, execute the scaling.
  tick: function() {

    if (this.target.object3D.scale.x !== this.lastScale) {
      this.render();
    }
  },

  render: function() {

    var scaleText = ""
    const scale = 1 / this.target.object3D.scale.x


    console.log(scale)
    console.log(scale.toLocaleString());

    // update text
    if (scale >= 1) {
      scaleText = formatNumber(scale) + ":1"
    }
    else {
      scaleText = "1:" + formatNumber(1 / scale)
    }
    this.text.setAttribute('value', scaleText);

    var unitText = "";
    var unitLength = 1;

    if (scale < 1e-12) {
      unitText = "picometer";
      unitLength = 1e-15;
    }
    else if (scale < 1e-9) {
      unitText = "femtometer";
      unitLength = 1e-12;
    }
    else if (scale < 1e-6) {
      unitText = "nanometer";
      unitLength = 1e-9;
    }
    else if (scale < 1e-3) {
      unitText = "micrometer";
      unitLength = 1e-6;
    }
    else if (scale < 1e-2) {
      unitText = "millimeter";
      unitLength = 1e-3;
    }
    else if (scale < 1) {
      unitText = "centimeter";
      unitLength = 0.01;
    }
    else if (scale < 1e+3) {
      unitText = "meter";
      unitLength = 1;
    }
    else if (scale < 1.496e+11) {
      unitText = "kilometer";
      unitLength = 1e+3;
    }
    else if (scale < 9.461e+15) {
      unitText = "A.U.";
      unitLength = 1.496e+11;
    }
    else if (scale < 3.086e+22) {
      unitText = "Light Year";
      unitLength = 9.461e+15;
    }
    else {
      unitText = "Megaparsec";
      unitLength = 3.086e+22;
    }

    // length of ruler will be nearest power of 10 for lower values.
    // But we must work in appropriate units
    // Matters since some units like A.U. and L.Y. are not metric powers of 10.
    var actualLength = unitLength * Math.pow(10, Math.round(Math.log10(scale / unitLength)));

    var lengthInUnits = actualLength / unitLength
    var rulerText = formatNumber(lengthInUnits) + " " + unitText;
    // add pluralization of units where necessary.
    rulerText += formatNumber(lengthInUnits) == "1" ? "" : "s";
    this.rulerText.setAttribute('value', rulerText);
    this.ruler.setAttribute('width', actualLength / scale);


    // update record of scale rendered.
    this.lastScale = this.target.object3D.scale.x;
  }

});

function formatNumber(number) {
  // toPrecision gets us 2 Significant Figures.
  // But it also generates scientific notation,
  // and superfluous trailing 0s in decimals.
  // Converting back to number then to string again drops these.
  number = Number(number.toPrecision(2))
  return number.toString();
}

// Entity is moved based on setting/clearing states
// x/y/z-plus/minus for position
// x/y/z-rot-plus/minus for rotation
// Movement speed is configurable in m/s
// Rotation speed is configurable in degrees/s

AFRAME.registerComponent('state-driven-movement', {
  schema: {
     moverate:   {type: 'number', default: '2'},
     rotaterate: {type: 'number', default: '45'},
  },

  update: function() {
    // internally store move rate as movement per msec
    this.moveRate = this.data.moverate / 1000;

    // and rotation rate as radians per msec
    this.rotateRate = this.data.rotaterate * Math.PI / 180000;
  },

  tick: function(time, timeDelta) {

   // Update position and rotation based on states set.
    if (this.el.is("x-plus")) {
      this.el.object3D.position.x += this.moveRate * timeDelta
    }
    else if (this.el.is("x-minus")) {
      this.el.object3D.position.x -= this.moveRate * timeDelta
    }

    if (this.el.is("y-plus")) {
      this.el.object3D.position.y += this.moveRate * timeDelta
    }
    else if (this.el.is("y-minus")) {
      this.el.object3D.position.y -= this.moveRate * timeDelta
    }

    if (this.el.is("z-plus")) {
      this.el.object3D.position.z += this.moveRate * timeDelta
    }
    else if (this.el.is("z-minus")) {
      this.el.object3D.position.z -= this.moveRate * timeDelta
    }

    if (this.el.is("x-rot-plus")) {
      this.el.object3D.rotation.x += this.rotateRate * timeDelta
    }
    else if (this.el.is("x-rot-minus")) {
      this.el.object3D.rotation.x -= this.rotateRate * timeDelta
    }

    if (this.el.is("y-rot-plus")) {
      this.el.object3D.rotation.y += this.rotateRate * timeDelta
    }
    else if (this.el.is("y-rot-minus")) {
      this.el.object3D.rotation.y -= this.rotateRate * timeDelta
    }

    if (this.el.is("z-rot-plus")) {
      this.el.object3D.rotation.z += this.rotateRate * timeDelta
    }
    else if (this.el.is("z-rot-minus")) {
      this.el.object3D.rotation.z -= this.rotateRate * timeDelta
    }
  }
});

// Set states based on thumbstick positions.
// controller: selector for the controller with the thumbstick
// bindings: stats to set for each of up/down/left/right.
// sensitivity: 0 to 1- how far off center thumbstick must be to count as movement.
// Note the default settings, which give standard left thumbstick movement
// don't actually work very well because the X & Z directions are fixed
// in space.  Could make this work using a nested set of "gimbals", but you get
// a better movement experience by allowing for the position of the controller
// itself, using thumbstick-object-control.
AFRAME.registerComponent('thumbstick-states', {
  schema: {
     controller:   {type: 'selector', default: "#lhand"},
     bindings:     {type: 'array', default: "z-minus,z-plus,x-minus,x-plus"},
     sensitivity:  {type: 'number', default: 0.5}
  },

  multiple: true,

  init: function() {
    this.controller = this.data.controller;

    this.listeners = {
      thumbstickMoved: this.thumbstickMoved.bind(this),
    }
  },

  update: function() {

    this.yplus = this.data.bindings[0]
    this.yminus = this.data.bindings[1]
    this.xplus = this.data.bindings[2]
    this.xminus = this.data.bindings[3]

    this.controller.addEventListener('thumbstickmoved',
                                     this.listeners.thumbstickMoved,
                                     false);

  },

  thumbstickMoved: function(event) {

    const x = event.detail.x
    const y = event.detail.y

    if (Math.abs(x) > this.data.sensitivity) {
      if (x > 0) {
        this.el.addState(this.xplus)
        this.el.removeState(this.xminus)
      }
      else {
        this.el.addState(this.xminus)
        this.el.removeState(this.xplus)
      }
    }
    else
    {
      this.el.removeState(this.xplus)
      this.el.removeState(this.xminus)
    }

    if (Math.abs(y) > this.data.sensitivity) {
      if (y > 0) {
        this.el.addState(this.yplus)
        this.el.removeState(this.yminus)
      }
      else {
        this.el.addState(this.yminus)
        this.el.removeState(this.yplus)
      }
    }
    else
    {
      this.el.removeState(this.yplus)
      this.el.removeState(this.yminus)
    }
  }
});

AFRAME.registerComponent('info-panel', {

  schema : {
    object: {type: 'selector'},
    textbank: {type: 'selector', default: '#text'},
  },

  init : function () {
    //console.log("JSON: " + this.data.textbank.data);

    this.textbank = JSON.parse(this.data.textbank.data);
    var sceneEl = document.querySelector('a-scene');
    var textData;
    if (sceneEl.is('vr-mode')) {
      textData = this.textbank['info-panel'];
    }
    else
    {
      textData = this.textbank['info-panel-desktop'];
    }

    this.upper = document.createElement('a-entity');
    this.upper.setAttribute('framed-block', "height:0.1;width:1;depth:0.02;frame:0.004;framecolor:#fff;facecolor:#000")
    this.upper.setAttribute('position', "0 0.25 0")
    this.upper.setAttribute('class','clickable-object');

    this.el.appendChild(this.upper);
    this.upperText = document.createElement('a-text');
    this.upperText.setAttribute('id', "upper-text")
    this.upperText.setAttribute('position', "0 0 0.01")
    this.upperText.setAttribute('value', textData.title)
    this.upperText.setAttribute('color', 'white')
    this.upperText.setAttribute('align', 'center')
    this.upperText.setAttribute('width', 0.9)
    this.upperText.setAttribute('wrap-count', 40)
    this.upper.appendChild(this.upperText);

    this.lower = document.createElement('a-entity');
    this.lower.setAttribute('framed-block', "height:0.4;width:1;depth:0.02;frame:0.004;framecolor:#fff;facecolor:#000")
    // setting clickable-object on parent doesn't seem to cover both children.
    // so to make whole area clickable we also set this as a clickable object.
    this.lower.setAttribute('clickable-object', "id:#info-panel");
    this.el.appendChild(this.lower);

    this.lowerText = document.createElement('a-text');
    this.lowerText.setAttribute('id', "lower-text")
    this.lowerText.setAttribute('value', textData.detail)
    this.lowerText.setAttribute('position', "0 0 0.01")
    this.lowerText.setAttribute('color', 'white')
    this.lowerText.setAttribute('align', 'center')
    this.lowerText.setAttribute('width', 0.9)
    this.lowerText.setAttribute('wrap-count', 50)
    this.lower.appendChild(this.lowerText);

    this.credit = document.createElement('a-entity');
    this.credit.setAttribute('framed-block', "height:0.1;width:1;depth:0.02;frame:0.004;framecolor:#fff;facecolor:#000")
    this.credit.setAttribute('position', "0 -0.25 0")
    // setting clickable-object on parent doesn't seem to cover all children.
    // so to make whole area clickable we also set this as a clickable object.
    this.credit.setAttribute('clickable-object', "id:#info-panel");
    this.el.appendChild(this.credit);

    this.creditText = document.createElement('a-text');
    this.creditText.setAttribute('id', "credit-text")
    this.creditText.setAttribute('value', textData.credit)
    this.creditText.setAttribute('position', "0 0 0.01")
    this.creditText.setAttribute('color', 'white')
    this.creditText.setAttribute('align', 'center')
    this.creditText.setAttribute('width', 0.9)
    this.creditText.setAttribute('wrap-count', 50)
    this.credit.appendChild(this.creditText);

    this.listeners = {
      'objectClicked' : this.objectListener.bind(this)
    }
    this.el.addEventListener("objectClicked", this.listeners.objectClicked);
  },

  objectListener: function(event) {

    var textData = this.textbank[event.detail.id]

    if(!textData) {
      textData = this.textbank[event.detail.id.replace("-desktop","")];
    }

    this.upperText.setAttribute('value', textData.title);
    this.lowerText.setAttribute('value', textData.detail);
    this.creditText.setAttribute('value', textData.credit);
  }

});


AFRAME.registerComponent('clickable-object', {

  schema: {
    id: {type: 'selector'},
    infopanel: {type: 'selector', default: '#info-panel'}
  },

  init: function () {

    this.el.setAttribute('class','clickable-object');

    this.listeners = {
      'click' : this.clickListener.bind(this)
    }
    this.el.addEventListener("click", this.listeners.click);
  },

  clickListener: function() {
    var sceneEl = document.querySelector('a-scene');
    if (sceneEl.is('vr-mode')) {
      this.data.infopanel.emit('objectClicked',{'id': this.data.id.id});
    }
    else {
      this.data.infopanel.emit('objectClicked',{'id': this.data.id.id + "-desktop"});
    }
  },

});

AFRAME.registerComponent('framed-block', {
schema: {
  height:     {type: 'number', default: 2},
  width:      {type: 'number', default: 2},
  depth:      {type: 'number', default: 2},
  frame:      {type: 'number', default: 0.2},
  framecolor: {type: 'color', default: '#000'},
  facecolor:  {type: 'color', default: '#AAA'}
},

/**
 * Initial creation and setting of the mesh.
 */
init: function () {
  var data = this.data;
  var el = this.el;

  // Create geometry.
  //this.geometry = new THREE.BoxBufferGeometry(data.width, data.height, data.depth);

  const BIGX = this.data.width / 2
  const BIGY = this.data.height / 2
  const BIGZ = this.data.depth / 2
  const SMALLX = this.data.width / 2 - this.data.frame
  const SMALLY = this.data.height / 2 - this.data.frame
  const SMALLZ = this.data.depth / 2 - this.data.frame

  this.geometry = new THREE.BufferGeometry();
  // Vertices - we have 3 vertices for each of the 8 corners of the cube.
  // Every vertex has two "small" components, and one big one.
  const vertices = new Float32Array( [
     SMALLX,  SMALLY,    BIGZ,
     SMALLX,    BIGY,  SMALLZ,
     BIGX,    SMALLY,  SMALLZ,

     SMALLX,  SMALLY,   -BIGZ,
     SMALLX,    BIGY, -SMALLZ,
     BIGX,    SMALLY, -SMALLZ,

     SMALLX, -SMALLY,    BIGZ,
     SMALLX,   -BIGY,  SMALLZ,
     BIGX,   -SMALLY,  SMALLZ,

     SMALLX, -SMALLY,   -BIGZ,
     SMALLX,   -BIGY, -SMALLZ,
     BIGX,   -SMALLY, -SMALLZ,

    -SMALLX,  SMALLY,    BIGZ,
    -SMALLX,    BIGY,  SMALLZ,
    -BIGX,    SMALLY,  SMALLZ,

    -SMALLX,  SMALLY,   -BIGZ,
    -SMALLX,    BIGY, -SMALLZ,
    -BIGX,    SMALLY, -SMALLZ,

    -SMALLX, -SMALLY,    BIGZ,
    -SMALLX,   -BIGY,  SMALLZ,
    -BIGX,   -SMALLY,  SMALLZ,

    -SMALLX, -SMALLY,   -BIGZ,
    -SMALLX,   -BIGY, -SMALLZ,
    -BIGX,   -SMALLY, -SMALLZ,
  ] );

  // itemSize = 3 because there are 3 values (components) per vertex
  this.geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );

  // Now we define the faces in terms of vertex indices.
  const indices = []

  // 8 corner triangles.
  indices.push(0, 2, 1,
               3, 4, 5,
               6, 7, 8,
               9, 11, 10,
               12, 13, 14,
               15, 17, 16,
               18, 20, 19,
               21, 22, 23);

  // 12 edges.
  createRectangle(1, 2, 4, 5)
  createRectangle(0, 1, 12, 13)
  createRectangle(2, 0, 8, 6)
  createRectangle(4, 3, 16, 15)
  createRectangle(3, 5, 9, 11)
  createRectangle(7, 6, 19, 18)
  createRectangle(8, 7, 11, 10)
  createRectangle(9, 10, 21, 22)
  createRectangle(12, 14, 18, 20)
  createRectangle(14, 13, 17, 16)
  createRectangle(17, 15, 23, 21)
  createRectangle(19, 20, 22, 23)

  // 6 faces.
  createRectangle(6, 0, 18, 12)
  createRectangle(3, 9, 15, 21)
  createRectangle(1, 4, 13, 16)
  createRectangle(10, 7, 22, 19)
  createRectangle(5, 2, 11, 8)
  createRectangle(14, 17, 20, 23)

  function createRectangle(a, b, c, d) {
    indices.push(a, b, c);
    indices.push(c, b, d);
  }

  this.geometry.setIndex(indices);
  this.geometry.computeVertexNormals();

  // 8 + 2 x 12 = 32 triangles = 96 vertices for the "frame"
  this.geometry.addGroup(0, 96, 0 );
  // 2 x 6 = 12 triangles = 36 vertices for the faces.
  this.geometry.addGroup(96, 36, 1);

  // Create material.
  this.frameMaterial = new THREE.MeshStandardMaterial({color: data.framecolor, roughness: 0.3});
  this.faceMaterial = new THREE.MeshStandardMaterial({color: data.facecolor, roughness: 1.0});

  // Create mesh.
  this.mesh = new THREE.Mesh(this.geometry, [this.frameMaterial, this.faceMaterial]);

  // Set mesh on entity.
  el.setObject3D('mesh', this.mesh);
}
});
