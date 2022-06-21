AFRAME.registerComponent('scalable', {
  schema: {    
    grabController:   {type: 'selector', default: "#rhand"},
  },

  init: function() {

    // The speed at which we scale in/out.
    // This is a rate per second.  Take a root of this to get a scaling factor.
    this.scaleSpeed = 10;

    // vector used for calculating re-centering
    this.recenteringVector = new THREE.Vector3();

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
    this.scaleGrabbedElement(scalar)

    this.adjustChildrenVisibility();
  },

  // listener for scale in event
  scaleIn: function(timeDelta) {
    const scalar = Math.pow(this.scaleSpeed, timeDelta/1000);
    this.el.object3D.scale.divideScalar(scalar);

    // also scale any element that is grabbed (parented by controller)
    this.scaleGrabbedElement(1 / scalar)

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

      if (!child.id ||
          (this.checkScale.x < 0.0001) ||
          (this.checkScale.x > 100000)) {
        child.object3D.visible = false;
        child.setAttribute('clickable-object', 'disabled:true')
      }
      else
      {
        child.object3D.visible = true;
        child.setAttribute('clickable-object', 'disabled:false')
      }
    }
  },

  scaleGrabbedElement: function(factor) {

    const grabbedEl = this.data.grabController.components['laser-manipulation'].grabbedEl
    

    if (grabbedEl) {
      // scale grabbed element about the grabbed point.
      const contactPoint = this.data.grabController.components['laser-manipulation'].contactPoint
      contactPoint.object3D.scale.multiplyScalar(factor);      
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

// Event-drive snap turns left & right.
// Fire events y-rot-plus/minus for rotation.
// Nothing else supported - could easily be extended when required.
// Rotation speed is configurable in degrees/event
AFRAME.registerComponent('event-driven-movement', {
  schema: {     
     rotateRate: {type: 'number', default: '30'},
  },

  init: function() {
    this.listeners = {
      yRotPlus: this.yRotPlus.bind(this),
      yRotMinus: this.yRotMinus.bind(this),
    }
  },

  update: function() {

    // internally store rotation rate as radians per event
    this.rotateRate = this.data.rotateRate * Math.PI / 180;

    this.el.addEventListener('y-rot-plus',
                             this.listeners.yRotPlus,
                             false);
    this.el.addEventListener('y-rot-minus',
                             this.listeners.yRotMinus,
                             false);
  },

  yRotPlus: function() {
    this.el.object3D.rotation.y += this.rotateRate;
  },

  yRotMinus: function() {
    this.el.object3D.rotation.y -= this.rotateRate;
  }

});

/* NOT CURRENTLY USED */
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
     bindings:     {type: 'array', default: ["none", "none", "none", "none"]},
     tBindings:    {type: 'array', default: []},
     gBindings:    {type: 'array', default: []},
     tgBindings:   {type: 'array', default: []},
     sensitivity:  {type: 'number', default: 0.5}
  },

  multiple: true,

  init() {
    this.controller = this.data.controller;

    this.listeners = {
      thumbstickMoved: this.thumbstickMoved.bind(this),
      triggerUp: this.triggerUp.bind(this),
      triggerDown: this.triggerDown.bind(this),
      gripUp: this.gripUp.bind(this),
      gripDown: this.gripDown.bind(this),
    }

    this.states = {
      gripDown: false,
      triggerDown: false,
    }

  },

  update() {

    this.controller.addEventListener('thumbstickmoved',
                                     this.listeners.thumbstickMoved);
    this.controller.addEventListener('triggerup',
                                     this.listeners.triggerUp);
    this.controller.addEventListener('triggerdown',
                                     this.listeners.triggerDown);
    this.controller.addEventListener('gripup',
                                     this.listeners.gripUp);
    this.controller.addEventListener('gripdown',
                                     this.listeners.gripDown);

    this.updateBindings()

  },

  updateBindings() {

    // clear all pre-existing state
    const removeStates = (set) => set.forEach((item) => this.el.removeState(item) )
    removeStates(this.data.bindings)
    removeStates(this.data.tBindings)
    removeStates(this.data.gBindings)
    removeStates(this.data.tgBindings)

    // now update bindings
    var binding;

    if (!this.states.triggerDown && !this.states.gripDown) {
      binding = (x) => this.data.bindings[x]      
    }
    else if (this.states.triggerDown && !this.states.gripDown) {
      // trigger down.  If tBinding not specified, fall back to regular bindings
      binding = (x) => this.data.tBindings[x] ||
                       this.data.bindings[x]
    }
    else if (!this.states.triggerDown && this.states.gripDown) {
      // grip down.  If gBinding not specified, fall back to regular bindings
      binding = (x) => this.data.gBindings[x] ||
                       this.data.bindings[x]
    }
    else {
      // trigger and grip down.  If tgBinding not specified, fall back to t, g, or regular bindings
      binding = (x) => this.data.tgBindings[x] ||
                       this.data.gBindings[x] ||
                       this.data.tBindings[x] ||
                       this.data.bindings[x]
    }

    this.yplus = binding(0)
    this.yminus = binding(1)
    this.xplus = binding(2)
    this.xminus = binding(3)

    console.log(this)
  },

  gripDown(event) {

    this.states.gripDown = true;
    this.updateBindings()
  },

  gripUp(event) {
    this.states.gripDown = false;
    this.updateBindings()
  },

  triggerDown(event) {
    this.states.triggerDown = true;
    this.updateBindings()
  },

  triggerUp(event) {
    this.states.triggerDown = false;
    this.updateBindings()
  },

  thumbstickMoved(event) {

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

// Params as per thumbstick-states
// cooldown: number of msecs between successive occurences of a single event.
AFRAME.registerComponent('thumbstick-events', {
  schema: {
     controller:   {type: 'selector', default: "#lhand"},
     bindings:     {type: 'array', default: ["none", "none", "none", "none"]},
     tBindings:    {type: 'array', default: []},
     gBindings:    {type: 'array', default: []},
     tgBindings:    {type: 'array', default: []},
     sensitivity:  {type: 'number', default: 0.5},
     cooldown:      {type: 'number', default: 500}
  },

  multiple: true,

  init: function() {
    this.controller = this.data.controller;

    this.listeners = {
      thumbstickMoved: this.thumbstickMoved.bind(this),
      triggerUp: this.triggerUp.bind(this),
      triggerDown: this.triggerDown.bind(this),
      gripUp: this.gripUp.bind(this),
      gripDown: this.gripDown.bind(this),
    }

    this.states = {
      gripDown: false,
      triggerDown: false,
    }
  },

  update: function() {

    this.yplusBlocked = false;
    this.yminusBlocked = false;
    this.xplusBlocked = false;
    this.xminusBlocked = false;

    this.controller.addEventListener('thumbstickmoved',
                                     this.listeners.thumbstickMoved,
                                     false);
    this.controller.addEventListener('triggerup',
                                     this.listeners.triggerUp);
    this.controller.addEventListener('triggerdown',
                                     this.listeners.triggerDown);
    this.controller.addEventListener('gripup',
                                     this.listeners.gripUp);
    this.controller.addEventListener('gripdown',
                                     this.listeners.gripDown);
    this.updateBindings()

  },

  
  updateBindings() {

    var binding;

    if (!this.states.triggerDown && !this.states.gripDown) {
      binding = (x) => this.data.bindings[x]      
    }
    else if (this.states.triggerDown && !this.states.gripDown) {
      // trigger down.  If tBinding not specified, fall back to regular bindings
      binding = (x) => this.data.tBindings[x] ||
                       this.data.bindings[x]
    }
    else if (!this.states.triggerDown && this.states.gripDown) {
      // grip down.  If gBinding not specified, fall back to regular bindings
      binding = (x) => this.data.gBindings[x] ||
                       this.data.bindings[x]
    }
    else {
      // trigger and grip down.  If tgBinding not specified, fall back to t, g, or regular bindings
      binding = (x) => this.data.tgBindings[x] ||
                       this.data.gBindings[x] ||
                       this.data.tBindings[x] ||
                       this.data.bindings[x]
    }

    this.yplus = binding(0)
    this.yminus = binding(1)
    this.xplus = binding(2)
    this.xminus = binding(3)

    console.log(this)
  },

  gripDown(event) {

    this.states.gripDown = true;
    this.updateBindings()
  },

  gripUp(event) {
    this.states.gripDown = false;
    this.updateBindings()
  },

  triggerDown(event) {
    this.states.triggerDown = true;
    this.updateBindings()
  },

  triggerUp(event) {
    this.states.triggerDown = false;
    this.updateBindings()
  },

  thumbstickMoved: function(event) {

    const x = event.detail.x
    const y = event.detail.y

    if (Math.abs(x) > this.data.sensitivity) {
      if (x > 0) {
        if (!this.xplusBlocked) {
          this.el.emit(this.xplus)
          this.xplusBlocked = true;
          setTimeout(() => {this.xplusBlocked = false}, this.data.cooldown);
        }
      }
      else {
        if (!this.xminusBlocked) {
          this.el.emit(this.xminus)
          this.xminusBlocked = true;
          setTimeout(() => {this.xminusBlocked = false}, this.data.cooldown);
        }
      }
    }

    if (Math.abs(y) > this.data.sensitivity) {
      if (y > 0) {
        if (!this.yplusBlocked) {
          this.el.emit(this.yplus)
          this.yplusBlocked = true;
          setTimeout(() => {this.yplusBlocked = false}, this.data.cooldown);
        }
      }
      else {
        if (!this.yminusBlocked) {
          this.el.emit(this.yminus)
          this.yminusBlocked = true;
          setTimeout(() => {this.yminusBlocked = false}, this.data.cooldown);
        }
      }
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
    infopanel: {type: 'selector', default: '#info-panel'},
    disabled: {type: 'boolean', default: 'false'}
  },

  init: function () {

    this.el.setAttribute('class','clickable-object');

    this.listeners = {
      'click' : this.clickListener.bind(this)
    }
    this.el.addEventListener("click", this.listeners.click);
  },

  update: function () {
    if (this.data.disabled) {
      this.el.setAttribute('class','');
    }
    else {
      this.el.setAttribute('class','clickable-object');
    }
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

const GLOBAL_DATA = {
  tempMatrix: new THREE.Matrix4(),
  tempQuaternion: new THREE.Quaternion(),
}

// Change the parent of an object without changing its transform.
AFRAME.registerComponent('object-parent', {

  schema: {
    parent:     {type: 'selector'},    
  },

  update() {
    const object = this.el.object3D
    const oldParent = object.parent
    const newParent = this.data.parent.object3D

    if (object.parent === newParent) {
      return;
    }

    console.log(`Reparenting ${object.el.id} from ${oldParent.el ? oldParent.el.id : "unknown"} to ${newParent.el ? newParent.el.id : "unknown"}`);
  
    // make sure all matrices are up to date before we do anything.
    // this may be overkill, but ooptimizing for reliability over performance.
    oldParent.updateMatrixWorld();
    oldParent.updateMatrix();
    object.updateMatrix();
    newParent.updateMatrixWorld();
    newParent.updateMatrix();
  
    // Now update the object's matrix to the new frame of reference.
    GLOBAL_DATA.tempMatrix.copy(newParent.matrixWorld).invert();
    object.matrix.premultiply(oldParent.matrixWorld);
    object.matrix.premultiply(GLOBAL_DATA.tempMatrix);
    object.matrix.decompose(object.position, object.quaternion, object.scale);
    object.matrixWorldNeedsUpdate = true;

    // finally, change the object's parent.
    newParent.add(object);
  }
});

// Add this to the relevant controller
AFRAME.registerComponent('laser-manipulation', {

  schema: {

    defaultParent: {type: 'selector'},
    rotateRate: {type: 'number', default: '45'},
  },

  update: function() {

    // internally store rotation rate as radians per event
    this.rotateRate = this.data.rotateRate * Math.PI / 180;
  },

  init() {
    // controller must have an ID so that
    console.assert(this.el.id)

    // This is a rate per second.  We scale distance by this factor per second.
    // Take a root of this to get a scaling factor.
    this.moveSpeed = 3;

    // set up listeners
    this.triggerUp = this.triggerUp.bind(this)
    this.triggerDown = this.triggerDown.bind(this)
    this.el.addEventListener('triggerup', this.triggerUp)
    this.el.addEventListener('triggerdown', this.triggerDown)

    // variable to track any grabbed element
    this.grabbedEl = null;

    // child object used as container for any entity that can be grabbed.
    // (this helps with scaling, rotation etc. of grabbed entity)
    this.contactPoint = document.createElement('a-entity')
    this.contactPoint.setAttribute('id', `${this.el.id}-contact-point`)
    this.el.appendChild(this.contactPoint)
  },

  triggerDown(evt) {

    console.assert(!this.grabbedEl)

    const intersections = this.getIntersections(evt.target);

    if (intersections.length === 0)  return;

    const element = intersections[0]

    const intersectionData = this.el.components.raycaster.getIntersection(element)

    // reparent element to this controller.
    this.grabbedEl = element
    const grabbedPoint = this.el  .object3D.worldToLocal(intersectionData.point)
    this.contactPoint.object3D.position.copy(grabbedPoint)
    element.setAttribute('object-parent', 'parent', `#${this.el.id}-contact-point`)
  },

  triggerUp() {

    if (!this.grabbedEl) return

    this.grabbedEl.setAttribute('object-parent', 'parent', `#${this.data.defaultParent.id}`)
    this.grabbedEl = null
  },

  getIntersections(controllerEl) {

    const els = controllerEl.components.raycaster.intersectedEls
    return els
  },

  // Implements moving out or in (in = -ve)
  moveOut(timeDelta) {
    const scalar = Math.pow(this.moveSpeed, timeDelta/1000);
    this.contactPoint.object3D.position.multiplyScalar(scalar)
  },

  
  tick: function(time, timeDelta) {
    
    if (this.el.is("moving-in")) {
      this.moveOut(-timeDelta);
    }
    else if (this.el.is("moving-out")) {
      this.moveOut(timeDelta);
    }

    if (this.el.is("rotating-y-plus")) {
      this.contactPoint.object3D.rotation.y += timeDelta * this.rotateRate / 1000;
    }
    else if (this.el.is("rotating-y-minus")) {
      this.contactPoint.object3D.rotation.y -= timeDelta * this.rotateRate / 1000;
    }
  }
});

