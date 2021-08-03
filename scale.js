AFRAME.registerComponent('scalable', {
  schema: {
    // I haven't really understood this.
    // Centering on origin works fine.  Centering on camera doesn't work.
    // !! Need to look at the code & logic again and simplify/correct this.
    center:   {type: 'selector', default: "#camera"},
  },

  init: function() {

    // The speed at which we scale in/out.  Multiply by this once per key-press.
    this.scaleSpeed = Math.pow(10, 0.1)

    // vector used for calculating re-centering
    this.vectorFromCenter = new THREE.Vector3();

    // listeners for scaling events (key presses)
    this.listeners = {
      'scaleOut' : this.scaleOut.bind(this),
      'scaleIn' : this.scaleIn.bind(this)
    }
    this.el.addEventListener("scale-out", this.listeners.scaleOut);
    this.el.addEventListener("scale-in", this.listeners.scaleIn);

    // ticks are used for scaling states (for oculus controllers)
    // keep tick rate down to 10/second
    this.tick = AFRAME.utils.throttleTick(this.tick, 100, this);
  },

  update: function () {
    this.center = this.data.center;
  },

  // listener for scale out event
  scaleOut: function() {
    this.el.object3D.scale.multiplyScalar(this.scaleSpeed);

    // adjust center.
    this.vectorFromCenter.subVectors(this.el.object3D.position,
                                   this.center.object3D.position);
    this.vectorFromCenter.multiplyScalar(this.scaleSpeed);
    this.el.object3D.position.addVectors(this.center.object3D.position,
                                         this.vectorFromCenter);
  },

  // listener for scale in event
  scaleIn: function() {
    this.el.object3D.scale.divideScalar(this.scaleSpeed);

    // adjust center.
    this.vectorFromCenter.subVectors(this.el.object3D.position,
                                   this.center.object3D.position);
    this.vectorFromCenter.divideScalar(this.scaleSpeed);
    this.el.object3D.position.addVectors(this.center.object3D.position,
                                         this.vectorFromCenter);
  },

  // if we are in a scaling in or out state, execute the scaling.
  tick: function() {

    if (this.el.is("scaling-in")) {
      this.scaleIn();
    }
    else if (this.el.is("scaling-out")) {
      this.scaleOut();
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
