(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = {
  vertex: "attribute vec2 aPosition;\nattribute vec2 aLumaPosition;\nattribute vec2 aChromaPosition;\nvarying vec2 vLumaPosition;\nvarying vec2 vChromaPosition;\nvoid main() {\n    gl_Position = vec4(aPosition, 0, 1);\n    vLumaPosition = aLumaPosition;\n    vChromaPosition = aChromaPosition;\n}\n",
  fragment: "// inspired by https://github.com/mbebenita/Broadway/blob/master/Player/canvas.js\n\nprecision mediump float;\nuniform sampler2D uTextureY;\nuniform sampler2D uTextureCb;\nuniform sampler2D uTextureCr;\nvarying vec2 vLumaPosition;\nvarying vec2 vChromaPosition;\nvoid main() {\n   // Y, Cb, and Cr planes are uploaded as LUMINANCE textures.\n   float fY = texture2D(uTextureY, vLumaPosition).x;\n   float fCb = texture2D(uTextureCb, vChromaPosition).x;\n   float fCr = texture2D(uTextureCr, vChromaPosition).x;\n\n   // Premultipy the Y...\n   float fYmul = fY * 1.1643828125;\n\n   // And convert that to RGB!\n   gl_FragColor = vec4(\n     fYmul + 1.59602734375 * fCr - 0.87078515625,\n     fYmul - 0.39176171875 * fCb - 0.81296875 * fCr + 0.52959375,\n     fYmul + 2.017234375   * fCb - 1.081390625,\n     1\n   );\n}\n",
  vertexStripe: "attribute vec2 aPosition;\nattribute vec2 aTexturePosition;\nvarying vec2 vTexturePosition;\n\nvoid main() {\n    gl_Position = vec4(aPosition, 0, 1);\n    vTexturePosition = aTexturePosition;\n}\n",
  fragmentStripe: "// extra 'stripe' texture fiddling to work around IE 11's poor performance on gl.LUMINANCE and gl.ALPHA textures\n\nprecision mediump float;\nuniform sampler2D uStripe;\nuniform sampler2D uTexture;\nvarying vec2 vTexturePosition;\nvoid main() {\n   // Y, Cb, and Cr planes are mapped into a pseudo-RGBA texture\n   // so we can upload them without expanding the bytes on IE 11\n   // which doesn\\'t allow LUMINANCE or ALPHA textures.\n   // The stripe textures mark which channel to keep for each pixel.\n   vec4 vStripe = texture2D(uStripe, vTexturePosition);\n\n   // Each texture extraction will contain the relevant value in one\n   // channel only.\n   vec4 vTemp = texture2D(uTexture, vTexturePosition) * vStripe;\n\n   // Assemble it back\n   float fLuminance = vTemp.x + vTemp.y + vTemp.z + vTemp.w;\n\n   gl_FragColor = vec4(fLuminance, fLuminance, fLuminance, 1);\n}\n"
};

},{}],2:[function(require,module,exports){

(function() {
  "use strict";

  var YUVBuffer = require('yuv-buffer'),
    YUVCanvas = require('./../src/yuv-canvas.js');

  var canvas = document.querySelector('canvas'),
    yuvCanvas = YUVCanvas.attach(canvas),
    format,
    frame,
    sourceData = {},
    sourceFader = {
      y: 1,
      u: 1,
      v: 1
    };

  function setupFrame() {
    format = YUVBuffer.format({
      width: 640,
      height: 480,
      chromaWidth: 320,
      chromaHeight: 240
    });
    frame = YUVBuffer.frame(format);
  }

  // Rasterize a loaded image and get at its RGBA bytes.
  // We'll use this in sample to get brightnesses from grayscale images.
  function extractImageData(image) {
    var canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth,
    canvas.height = image.naturalHeight;

    var context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    return context.getImageData(0, 0, canvas.width, canvas.height)
  }

  // In this example we have separate images with Y, U, and V plane data.
  // For each plane, we copy the grayscale values into the target YUVPlane
  // object's data, applying a per-plane multiplier which is manipulable
  // by the user.
  function copyBrightnessToPlane(imageData, plane, width, height, multiplier) {
    // Because we're doing multiplication that may wrap, use the browser-optimized
    // Uint8ClampedArray instead of the default Uint8Array view.
    var clampedBytes = new Uint8ClampedArray(plane.bytes.buffer, plane.bytes.offset, plane.bytes.byteLength);
    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        clampedBytes[y * plane.stride + x] = imageData.data[y * width * 4 + x * 4] * multiplier;
      }
    }
  }

  function setupSources() {
    function setup(index) {
      var image = document.getElementById(index + 'plane'),
        fader = document.getElementById(index + 'fader');

      function doit() {
        sourceData[index] = extractImageData(image);
        updateFrame();
      }
      if (image.naturalWidth) {
        doit();
      } else {
        image.addEventListener('load', doit);
      }

      fader.addEventListener('input', function() {
        sourceFader[index] = fader.value;
        updateFrame();
      })
    }
    setup('y');
    setup('u');
    setup('v');
  }

  function updateFrame() {
    // Copy data in!
    if (sourceData.y) {
      copyBrightnessToPlane(sourceData.y, frame.y, format.width, format.height, sourceFader.y);
    }
    if (sourceData.u) {
      copyBrightnessToPlane(sourceData.u, frame.u, format.chromaWidth, format.chromaHeight, sourceFader.u);
    }
    if (sourceData.v) {
      copyBrightnessToPlane(sourceData.v, frame.v, format.chromaWidth, format.chromaHeight, sourceFader.v);
    }

    yuvCanvas.drawFrame(frame);
  }

  setupFrame();
  setupSources();

})();

},{"./../src/yuv-canvas.js":9,"yuv-buffer":3}],3:[function(require,module,exports){
/*
Copyright (c) 2014-2016 Brion Vibber <brion@pobox.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
MPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
ONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/**
 * Represents metadata about a YUV frame format.
 * @typedef {Object} YUVFormat
 * @property {number} width - width of encoded frame in luma pixels
 * @property {number} height - height of encoded frame in luma pixels
 * @property {number} chromaWidth - width of encoded frame in chroma pixels
 * @property {number} chromaHeight - height of encoded frame in chroma pixels
 * @property {number} cropLeft - upper-left X coordinate of visible crop region, in luma pixels
 * @property {number} cropTop - upper-left Y coordinate of visible crop region, in luma pixels
 * @property {number} cropWidth - width of visible crop region, in luma pixels
 * @property {number} cropHeight - height of visible crop region, in luma pixels
 * @property {number} displayWidth - final display width of visible region, in luma pixels
 * @property {number} displayHeight - final display height of visible region, in luma pixels
 */

/**
 * Represents underlying image data for a single luma or chroma plane.
 * Cannot be interpreted without the format data from a frame buffer.
 * @typedef {Object} YUVPlane
 * @property {Uint8Array} bytes - typed array containing image data bytes
 * @property {number} stride - byte distance between rows in data
 */

/**
 * Represents a YUV image frame buffer, with enough format information
 * to interpret the data usefully. Buffer objects use generic objects
 * under the hood and can be transferred between worker threads using
 * the structured clone algorithm.
 *
 * @typedef {Object} YUVFrame
 * @property {YUVFormat} format
 * @property {YUVPlane} y
 * @property {YUVPlane} u
 * @property {YUVPlane} v
 */

/**
 * Holder namespace for utility functions and constants related to
 * YUV frame and plane buffers.
 *
 * @namespace
 */
var YUVBuffer = {
  /**
   * Validate a plane dimension
   * @param {number} dim - vertical or horizontal dimension
   * @throws exception on zero, negative, or non-integer value
   */
  validateDimension: function(dim) {
    if (dim <= 0 || dim !== (dim | 0)) {
      throw 'YUV plane dimensions must be a positive integer';
    }
  },

  /**
   * Validate a plane offset
   * @param {number} dim - vertical or horizontal dimension
   * @throws exception on negative or non-integer value
   */
  validateOffset: function(dim) {
    if (dim < 0 || dim !== (dim | 0)) {
      throw 'YUV plane offsets must be a non-negative integer';
    }
  },

  /**
   * Validate and fill out a YUVFormat object structure.
   *
   * At least width and height fields are required; other fields will be
   * derived if left missing or empty:
   * - chromaWidth and chromaHeight will be copied from width and height as for a 4:4:4 layout
   * - cropLeft and cropTop will be 0
   * - cropWidth and cropHeight will be set to whatever of the frame is visible after cropTop and cropLeft are applied
   * - displayWidth and displayHeight will be set to cropWidth and cropHeight.
   *
   * @param {YUVFormat} fields - input fields, must include width and height.
   * @returns {YUVFormat} - validated structure, with all derivable fields filled out.
   * @throws exception on invalid fields or missing width/height
   */
  format: function(fields) {
    var width = fields.width,
      height = fields.height,
      chromaWidth = fields.chromaWidth || width,
      chromaHeight = fields.chromaHeight || height,
      cropLeft = fields.cropLeft || 0,
      cropTop = fields.cropTop || 0,
      cropWidth = fields.cropWidth || width - cropLeft,
      cropHeight = fields.cropHeight || height - cropTop,
      displayWidth = fields.displayWidth || cropWidth,
      displayHeight = fields.displayHeight || cropHeight;
    this.validateDimension(width);
    this.validateDimension(height);
    this.validateDimension(chromaWidth);
    this.validateDimension(chromaHeight);
    this.validateOffset(cropLeft);
    this.validateOffset(cropTop);
    this.validateDimension(cropWidth);
    this.validateDimension(cropHeight);
    this.validateDimension(displayWidth);
    this.validateDimension(displayHeight);
    return {
      width: width,
      height: height,
      chromaWidth: chromaWidth,
      chromaHeight: chromaHeight,
      cropLeft: cropLeft,
      cropTop: cropTop,
      cropWidth: cropWidth,
      cropHeight: cropHeight,
      displayWidth: displayWidth,
      displayHeight: displayHeight
    };
  },

  /**
   * Allocate a new YUVPlane object of the given size.
   * @param {number} stride - byte distance between rows
   * @param {number} rows - number of rows to allocate
   * @returns {YUVPlane} - freshly allocated planar buffer
   */
  allocPlane: function(stride, rows) {
    YUVBuffer.validateDimension(stride);
    YUVBuffer.validateDimension(rows);
    return {
      bytes: new Uint8Array(stride * rows),
      stride: stride
    }
  },

  /**
   * Pick a suitable stride for a custom-allocated thingy
   * @param {number} width - width in bytes
   * @returns {number} - new width in bytes at least as large
   * @throws exception on invalid input width
   */
  suitableStride: function(width) {
    YUVBuffer.validateDimension(width);
    var alignment = 4,
      remainder = width % alignment;
    if (remainder == 0) {
      return width;
    } else {
      return width + (alignment - remainder);
    }
  },

  /**
   * Allocate or extract a YUVPlane object from given dimensions/source.
   * @param {number} width - width in pixels
   * @param {number} height - height in pixels
   * @param {Uint8Array} source - input byte array; optional (will create empty buffer if missing)
   * @param {number} stride - row length in bytes; optional (will create a default if missing)
   * @param {number} offset - offset into source array to extract; optional (will start at 0 if missing)
   * @returns {YUVPlane} - freshly allocated planar buffer
   */
  allocPlane: function(width, height, source, stride, offset) {
    var size, bytes;

    this.validateDimension(width);
    this.validateDimension(height);

    offset = offset || 0;

    stride = stride || this.suitableStride(width);
    this.validateDimension(stride);
    if (stride < width) {
      throw "Invalid input stride for YUV plane; must be larger than width";
    }

    size = stride * height;

    if (source) {
      if (source.length - offset < size) {
        throw "Invalid input buffer for YUV plane; must be large enough for stride times height";
      }
      bytes = source.slice(offset, offset + size);
    } else {
      bytes = new Uint8Array(size);
      stride = stride || this.suitableStride(width);
    }

    return {
      bytes: bytes,
      stride: stride
    };
  },

  /**
   * Allocate a new YUVPlane object big enough for a luma plane in the given format
   * @param {YUVFormat} format - target frame format
   * @param {Uint8Array} source - input byte array; optional (will create empty buffer if missing)
   * @param {number} stride - row length in bytes; optional (will create a default if missing)
   * @param {number} offset - offset into source array to extract; optional (will start at 0 if missing)
   * @returns {YUVPlane} - freshly allocated planar buffer
   */
  lumaPlane: function(format, source, stride, offset) {
    return this.allocPlane(format.width, format.height, source, stride, offset);
  },

  /**
   * Allocate a new YUVPlane object big enough for a chroma plane in the given format,
   * optionally copying data from an existing buffer.
   *
   * @param {YUVFormat} format - target frame format
   * @param {Uint8Array} source - input byte array; optional (will create empty buffer if missing)
   * @param {number} stride - row length in bytes; optional (will create a default if missing)
   * @param {number} offset - offset into source array to extract; optional (will start at 0 if missing)
   * @returns {YUVPlane} - freshly allocated planar buffer
   */
  chromaPlane: function(format, source, stride, offset) {
    return this.allocPlane(format.chromaWidth, format.chromaHeight, source, stride, offset);
  },

  /**
   * Allocate a new YUVFrame object big enough for the given format
   * @param {YUVFormat} format - target frame format
   * @param {YUVPlane} y - optional Y plane; if missing, fresh one will be allocated
   * @param {YUVPlane} u - optional U plane; if missing, fresh one will be allocated
   * @param {YUVPlane} v - optional V plane; if missing, fresh one will be allocated
   * @returns {YUVFrame} - freshly allocated frame buffer
   */
  frame: function(format, y, u, v) {
    y = y || this.lumaPlane(format);
    u = u || this.chromaPlane(format);
    v = v || this.chromaPlane(format);
    return {
      format: format,
      y: y,
      u: u,
      v: v
    }
  },

  /**
   * Duplicate a plane using new buffer memory.
   * @param {YUVPlane} plane - input plane to copy
   * @returns {YUVPlane} - freshly allocated and filled planar buffer
   */
  copyPlane: function(plane) {
    return {
      bytes: plane.bytes.slice(),
      stride: plane.stride
    };
  },

  /**
   * Duplicate a frame using new buffer memory.
   * @param {YUVFrame} frame - input frame to copyFrame
   * @returns {YUVFrame} - freshly allocated and filled frame buffer
   */
  copyFrame: function(frame) {
    return {
      format: frame.format,
      y: this.copyPlane(frame.y),
      u: this.copyPlane(frame.u),
      v: this.copyPlane(frame.v)
    }
  },

  /**
   * List the backing buffers for the frame's planes for transfer between
   * threads via Worker.postMessage.
   * @param {YUVFrame} frame - input frame
   * @returns {Array} - list of transferable objects
   */
  transferables: function(frame) {
    return [frame.y.bytes.buffer, frame.u.bytes.buffer, frame.v.bytes.buffer];
  }
};

module.exports = YUVBuffer;

},{}],4:[function(require,module,exports){
(function() {
  "use strict";

  /**
   * Create a YUVCanvas and attach it to an HTML5 canvas element.
   *
   * This will take over the drawing context of the canvas and may turn
   * it into a WebGL 3d canvas if possible. Do not attempt to use the
   * drawing context directly after this.
   *
   * @param {HTMLCanvasElement} canvas - HTML canvas element to attach to
   * @param {YUVCanvasOptions} options - map of options
   * @throws exception if WebGL requested but unavailable
   * @constructor
   * @abstract
   */
  function FrameSink(canvas, options) {
    throw new Error('abstract');
  }

  /**
   * Draw a single YUV frame on the underlying canvas, converting to RGB.
   * If necessary the canvas will be resized to the optimal pixel size
   * for the given buffer's format.
   *
   * @param {YUVBuffer} buffer - the YUV buffer to draw
   * @see {@link https://www.npmjs.com/package/yuv-buffer|yuv-buffer} for format
   */
  FrameSink.prototype.drawFrame = function(buffer) {
    throw new Error('abstract');
  };

  /**
   * Clear the canvas using appropriate underlying 2d or 3d context.
   */
  FrameSink.prototype.clear = function() {
    throw new Error('abstract');
  };

  module.exports = FrameSink;

})();

},{}],5:[function(require,module,exports){
/*
Copyright (c) 2014-2016 Brion Vibber <brion@pobox.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
MPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
(function() {
	"use strict";

	var FrameSink = require('./FrameSink.js'),
		YCbCr = require('./YCbCr.js');

	/**
	 * @param {HTMLCanvasElement} canvas - HTML canvas eledment to attach to
	 * @constructor
	 */
	function SoftwareFrameSink(canvas) {
		var self = this,
			ctx = canvas.getContext('2d'),
			imageData = null,
			resampleCanvas = null,
			resampleContext = null;



		function initImageData(width, height) {
			imageData = ctx.createImageData(width, height);

			// Prefill the alpha to opaque
			var data = imageData.data,
				pixelCount = width * height * 4;
			for (var i = 0; i < pixelCount; i += 4) {
				data[i + 3] = 255;
			}
		}

		function initResampleCanvas(cropWidth, cropHeight) {
			resampleCanvas = document.createElement('canvas');
			resampleCanvas.width = cropWidth;
			resampleCanvas.height = cropHeight;
			resampleContext = resampleCanvas.getContext('2d');
		}

		/**
		 * Actually draw a frame into the canvas.
		 * @param {YUVFrame} buffer - YUV frame buffer object to draw
		 */
		self.drawFrame = function drawFrame(buffer) {
			var format = buffer.format;

			if (canvas.width !== format.displayWidth || canvas.height !== format.displayHeight) {
				// Keep the canvas at the right size...
				canvas.width = format.displayWidth;
				canvas.height = format.displayHeight;
			}

			if (imageData === null ||
					imageData.width != format.width ||
					imageData.height != format.height) {
				initImageData(format.width, format.height);
			}

			// YUV -> RGB over the entire encoded frame
			YCbCr.convertYCbCr(buffer, imageData.data);

			var resample = (format.cropWidth != format.displayWidth || format.cropHeight != format.displayHeight);
			var drawContext;
			if (resample) {
				// hack for non-square aspect-ratio
				// putImageData doesn't resample, so we have to draw in two steps.
				if (!resampleCanvas) {
					initResampleCanvas(format.cropWidth, format.cropHeight);
				}
				drawContext = resampleContext;
			} else {
				drawContext = ctx;
			}

			// Draw cropped frame to either the final or temporary canvas
			drawContext.putImageData(imageData,
							         0, 0,
											 format.cropLeft, format.cropTop,
											 format.cropWidth, format.cropHeight);

			if (resample) {
				ctx.drawImage(resampleCanvas, 0, 0, format.displayWidth, format.displayHeight);
			}
		};

		self.clear = function() {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
		};

		return self;
	}

	SoftwareFrameSink.prototype = Object.create(FrameSink.prototype);

	module.exports = SoftwareFrameSink;
})();

},{"./FrameSink.js":4,"./YCbCr.js":7}],6:[function(require,module,exports){
/*
Copyright (c) 2014-2016 Brion Vibber <brion@pobox.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
MPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
(function() {
	"use strict";

	var FrameSink = require('./FrameSink.js'),
		shaders = require('../build/shaders.js');

	/**
	 * Warning: canvas must not have been used for 2d drawing prior!
	 *
	 * @param {HTMLCanvasElement} canvas - HTML canvas element to attach to
	 * @constructor
	 */
	function WebGLFrameSink(canvas) {
		var self = this,
			gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl'),
			debug = false; // swap this to enable more error checks, which can slow down rendering

		if (gl === null) {
			throw new Error('WebGL unavailable');
		}

		// GL!
		function checkError() {
			if (debug) {
				err = gl.getError();
				if (err !== 0) {
					throw new Error("GL error " + err);
				}
			}
		}

		function compileShader(type, source) {
			var shader = gl.createShader(type);
			gl.shaderSource(shader, source);
			gl.compileShader(shader);

			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				var err = gl.getShaderInfoLog(shader);
				gl.deleteShader(shader);
				throw new Error('GL shader compilation for ' + type + ' failed: ' + err);
			}

			return shader;
		}


		var program,
			unpackProgram,
			err;

		// In the world of GL there are no rectangles.
		// There are only triangles.
		// THERE IS NO SPOON.
		var rectangle = new Float32Array([
			// First triangle (top left, clockwise)
			-1.0, -1.0,
			+1.0, -1.0,
			-1.0, +1.0,

			// Second triangle (bottom right, clockwise)
			-1.0, +1.0,
			+1.0, -1.0,
			+1.0, +1.0
		]);

		var textures = {};
		var framebuffers = {};

		function createOrReuseTexture(name) {
			if (!textures[name]) {
				textures[name] = gl.createTexture();
			}
			return textures[name];
		}

		function uploadTexture(name, width, height, data) {
			var texture = createOrReuseTexture(name);
			if (WebGLFrameSink.stripe) {
				// Upload to a temporary RGBA texture, then unpack it.
				// This is faster than CPU-side swizzling in ANGLE on Windows.
				gl.useProgram(unpackProgram);

				if (!framebuffers[name]) {
					// Create a framebuffer and an empty target size
					framebuffers[name] = gl.createFramebuffer();
					gl.activeTexture(gl.TEXTURE0);
					gl.bindTexture(gl.TEXTURE_2D, texture);
					gl.texImage2D(
						gl.TEXTURE_2D,
						0, // mip level
						gl.RGBA, // internal format
						width,
						height,
						0, // border
						gl.RGBA, // format
						gl.UNSIGNED_BYTE, //type
						null // data!
					);
				}

				var tempTexture = createOrReuseTexture(name + '_temp');
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, tempTexture);
				gl.uniform1i(gl.getUniformLocation(unpackProgram, 'uTexture'), 0);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
				gl.texImage2D(
					gl.TEXTURE_2D,
					0, // mip level
					gl.RGBA, // internal format
					width / 4,
					height,
					0, // border
					gl.RGBA, // format
					gl.UNSIGNED_BYTE, //type
					data // data!
				);

				var stripeTexture = createOrReuseTexture(name + '_stripe');
				gl.activeTexture(gl.TEXTURE1);
				gl.bindTexture(gl.TEXTURE_2D, stripeTexture);
				gl.uniform1i(gl.getUniformLocation(unpackProgram, 'uStripe'), 1);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
				gl.texImage2D(
					gl.TEXTURE_2D,
					0, // mip level
					gl.RGBA, // internal format
					width,
					1,
					0, // border
					gl.RGBA, // format
					gl.UNSIGNED_BYTE, //type
					buildStripe(width, 1) // data!
				);

				var buf = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, buf);
				gl.bufferData(gl.ARRAY_BUFFER, rectangle, gl.STATIC_DRAW);

				var positionLocation = gl.getAttribLocation(program, 'aPosition');
				gl.enableVertexAttribArray(positionLocation);
				gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

				// Set up the texture geometry...
				var textureRectangle = new Float32Array([
					0, 0,
					1, 0,
					0, 1,
					0, 1,
					1, 0,
					1, 1
				]);

				var texturePositionBuffer = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, texturePositionBuffer);
				gl.bufferData(gl.ARRAY_BUFFER, textureRectangle, gl.STATIC_DRAW);

				var texturePositionLocation = gl.getAttribLocation(unpackProgram, 'aTexturePosition');
				gl.enableVertexAttribArray(texturePositionLocation);
				gl.vertexAttribPointer(texturePositionLocation, 2, gl.FLOAT, false, 0, 0);

				// Draw into the target texture...
				var fb = framebuffers[name];
				gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
				gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

				gl.drawArrays(gl.TRIANGLES, 0, rectangle.length / 2);

				gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	
			} else {
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, texture);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
				gl.texImage2D(
					gl.TEXTURE_2D,
					0, // mip level
					gl.LINEAR, // internal format
					width,
					height,
					0, // border
					gl.LINEAR, // format
					gl.UNSIGNED_BYTE, //type
					data // data!
				);
			}
		}

		function attachTexture(name, register, index) {
			gl.uniform1i(gl.getUniformLocation(program, name), index);
			gl.activeTexture(register);
			gl.bindTexture(gl.TEXTURE_2D, textures[name]);
		}

		function buildStripe(width, height) {
			var len = width * height,
				out = new Uint32Array(len);
			for (var i = 0; i < len; i += 4) {
				out[i    ] = 0x000000ff;
				out[i + 1] = 0x0000ff00;
				out[i + 2] = 0x00ff0000;
				out[i + 3] = 0xff000000;
			}
			return new Uint8Array(out.buffer);
		}

		function initProgram(vertexShaderSource, fragmentShaderSource) {
			var vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
			var fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

			var program = gl.createProgram();
			gl.attachShader(program, vertexShader);
			gl.attachShader(program, fragmentShader);

			gl.linkProgram(program);
			if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
				var err = gl.getProgramInfoLog(program);
				gl.deleteProgram(program);
				throw new Error('GL program linking failed: ' + err);
			}

			return program;
		}

		function init() {
			if (WebGLFrameSink.stripe) {
				unpackProgram = initProgram(shaders.vertexStripe, shaders.fragmentStripe);
			}
			program = initProgram(shaders.vertex, shaders.fragment);
		}

		/**
		 * Actually draw a frame.
		 * @param {YUVFrame} buffer - YUV frame buffer object
		 */
		self.drawFrame = function(buffer) {
			var format = buffer.format;

			if (canvas.width !== format.displayWidth || canvas.height !== format.displayHeight) {
				// Keep the canvas at the right size...
				canvas.width = format.displayWidth;
				canvas.height = format.displayHeight;
				self.clear();
			}

			if (!program) {
				init();
			}

			// Create the textures...
			// If using stripe mode this may switch program during upload!
			uploadTexture('uTextureY', buffer.y.stride, format.height, buffer.y.bytes);
			uploadTexture('uTextureU', buffer.u.stride, format.chromaHeight, buffer.u.bytes);
			uploadTexture('uTextureV', buffer.v.stride, format.chromaHeight, buffer.v.bytes);

			// Set up the rectangle and draw it
			gl.useProgram(program);

			// Set up geometry
			var buf = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, buf);
			gl.bufferData(gl.ARRAY_BUFFER, rectangle, gl.STATIC_DRAW);

			var positionLocation = gl.getAttribLocation(program, 'aPosition');
			gl.enableVertexAttribArray(positionLocation);
			gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);


			// Set up the texture geometry...
			function setupTexturePosition(varname, texWidth) {
				// Warning: assumes that the stride for Cb and Cr is the same size in output pixels
				var textureX0 = format.cropLeft / texWidth;
				var textureX1 = (format.cropLeft + format.cropWidth) / texWidth;
				var textureY0 = (format.cropTop + format.cropHeight) / format.height;
				var textureY1 = format.cropTop / format.height;
				var textureRectangle = new Float32Array([
					textureX0, textureY0,
					textureX1, textureY0,
					textureX0, textureY1,
					textureX0, textureY1,
					textureX1, textureY0,
					textureX1, textureY1
				]);

				var texturePositionBuffer = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, texturePositionBuffer);
				gl.bufferData(gl.ARRAY_BUFFER, textureRectangle, gl.STATIC_DRAW);

				var texturePositionLocation = gl.getAttribLocation(program, varname);
				gl.enableVertexAttribArray(texturePositionLocation);
				gl.vertexAttribPointer(texturePositionLocation, 2, gl.FLOAT, false, 0, 0);
			}
			setupTexturePosition('aLumaPosition', buffer.y.stride);
			setupTexturePosition('aChromaPosition', buffer.u.stride * format.width / format.chromaWidth);
			
			attachTexture('uTextureY', gl.TEXTURE0, 0);
			attachTexture('uTextureU', gl.TEXTURE1, 1);
			attachTexture('uTextureV', gl.TEXTURE2, 2);

			// Aaaaand draw stuff.
			gl.drawArrays(gl.TRIANGLES, 0, rectangle.length / 2);
			
			gl.getError();
		};

		self.clear = function() {
			gl.viewport(0, 0, canvas.width, canvas.height);
			gl.clearColor(0.0, 0.0, 0.0, 0.0);
			gl.clear(gl.COLOR_BUFFER_BIT);
		};

		self.clear();

		return self;
	}

	/**
	 * Static function to check if WebGL will be available with appropriate features.
	 *
	 * @returns {boolean} - true if available
	 */
	WebGLFrameSink.isAvailable = function() {
		var canvas = document.createElement('canvas'),
			gl;
		canvas.width = 1;
		canvas.height = 1;
		var options = {
			// Still dithering on whether to use this.
			// Recommend avoiding it, as it's overly conservative
			//failIfMajorPerformanceCaveat: true
		};
		try {
			gl = canvas.getContext('webgl', options) || canvas.getContext('experimental-webgl', options);
		} catch (e) {
			return false;
		}
		if (gl) {
			var register = gl.TEXTURE0,
				width = 4,
				height = 4,
				texture = gl.createTexture(),
				data = new Uint8Array(width * height),
				texWidth = width,
				format = gl.LUMINANCE,
				filter = gl.LINEAR;

			gl.activeTexture(register);
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
			gl.texImage2D(
				gl.TEXTURE_2D,
				0, // mip level
				format, // internal format
				texWidth,
				height,
				0, // border
				format, // format
				gl.UNSIGNED_BYTE, //type
				data // data!
			);

			var err = gl.getError();
			if (err) {
				// Doesn't support luminance textures?
				return false;
			} else {
				return true;
			}
		} else {
			return false;
		}
	};

	WebGLFrameSink.prototype = Object.create(FrameSink.prototype);

	module.exports = WebGLFrameSink;
})();

},{"../build/shaders.js":1,"./FrameSink.js":4}],7:[function(require,module,exports){
/*
Copyright (c) 2014-2016 Brion Vibber <brion@pobox.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
MPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
(function() {
	"use strict";

	var depower = require('./depower.js');

	/**
	 * Basic YCbCr->RGB conversion
	 *
	 * @author Brion Vibber <brion@pobox.com>
	 * @copyright 2014-2016
	 * @license MIT-style
	 *
	 * @param {YUVFrame} buffer - input frame buffer
	 * @param {Uint8ClampedArray} output - array to draw RGBA into
	 * Assumes that the output array already has alpha channel set to opaque.
	 */
	function convertYCbCr(buffer, output) {
		var width = buffer.format.width,
			height = buffer.format.height,
			hdec = depower(buffer.format.width / buffer.format.chromaWidth),
			vdec = depower(buffer.format.height / buffer.format.chromaHeight),
			bytesY = buffer.y.bytes,
			bytesCb = buffer.u.bytes,
			bytesCr = buffer.v.bytes,
			strideY = buffer.y.stride,
			strideCb = buffer.u.stride,
			strideCr = buffer.v.stride,
			outStride = 4 * width,
			YPtr = 0, Y0Ptr = 0, Y1Ptr = 0,
			CbPtr = 0, CrPtr = 0,
			outPtr = 0, outPtr0 = 0, outPtr1 = 0,
			colorCb = 0, colorCr = 0,
			multY = 0, multCrR = 0, multCbCrG = 0, multCbB = 0,
			x = 0, y = 0, xdec = 0, ydec = 0;

		if (hdec == 1 && vdec == 1) {
			// Optimize for 4:2:0, which is most common
			outPtr0 = 0;
			outPtr1 = outStride;
			ydec = 0;
			for (y = 0; y < height; y += 2) {
				Y0Ptr = y * strideY;
				Y1Ptr = Y0Ptr + strideY;
				CbPtr = ydec * strideCb;
				CrPtr = ydec * strideCr;
				for (x = 0; x < width; x += 2) {
					colorCb = bytesCb[CbPtr++];
					colorCr = bytesCr[CrPtr++];

					// Quickie YUV conversion
					// https://en.wikipedia.org/wiki/YCbCr#ITU-R_BT.2020_conversion
					// multiplied by 256 for integer-friendliness
					multCrR   = (409 * colorCr) - 57088;
					multCbCrG = (100 * colorCb) + (208 * colorCr) - 34816;
					multCbB   = (516 * colorCb) - 70912;

					multY = (298 * bytesY[Y0Ptr++]);
					output[outPtr0++] = (multY + multCrR) >> 8;
					output[outPtr0++] = (multY - multCbCrG) >> 8;
					output[outPtr0++] = (multY + multCbB) >> 8;
					outPtr0++;

					multY = (298 * bytesY[Y0Ptr++]);
					output[outPtr0++] = (multY + multCrR) >> 8;
					output[outPtr0++] = (multY - multCbCrG) >> 8;
					output[outPtr0++] = (multY + multCbB) >> 8;
					outPtr0++;

					multY = (298 * bytesY[Y1Ptr++]);
					output[outPtr1++] = (multY + multCrR) >> 8;
					output[outPtr1++] = (multY - multCbCrG) >> 8;
					output[outPtr1++] = (multY + multCbB) >> 8;
					outPtr1++;

					multY = (298 * bytesY[Y1Ptr++]);
					output[outPtr1++] = (multY + multCrR) >> 8;
					output[outPtr1++] = (multY - multCbCrG) >> 8;
					output[outPtr1++] = (multY + multCbB) >> 8;
					outPtr1++;
				}
				outPtr0 += outStride;
				outPtr1 += outStride;
				ydec++;
			}
		} else {
			outPtr = 0;
			for (y = 0; y < height; y++) {
				xdec = 0;
				ydec = y >> vdec;
				YPtr = y * strideY;
				CbPtr = ydec * strideCb;
				CrPtr = ydec * strideCr;

				for (x = 0; x < width; x++) {
					xdec = x >> hdec;
					colorCb = bytesCb[CbPtr + xdec];
					colorCr = bytesCr[CrPtr + xdec];

					// Quickie YUV conversion
					// https://en.wikipedia.org/wiki/YCbCr#ITU-R_BT.2020_conversion
					// multiplied by 256 for integer-friendliness
					multCrR   = (409 * colorCr) - 57088;
					multCbCrG = (100 * colorCb) + (208 * colorCr) - 34816;
					multCbB   = (516 * colorCb) - 70912;

					multY = 298 * bytesY[YPtr++];
					output[outPtr++] = (multY + multCrR) >> 8;
					output[outPtr++] = (multY - multCbCrG) >> 8;
					output[outPtr++] = (multY + multCbB) >> 8;
					outPtr++;
				}
			}
		}
	}

	module.exports = {
		convertYCbCr: convertYCbCr
	};
})();

},{"./depower.js":8}],8:[function(require,module,exports){
/*
Copyright (c) 2014-2016 Brion Vibber <brion@pobox.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
MPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
(function() {
  "use strict";

  /**
   * Convert a ratio into a bit-shift count; for instance a ratio of 2
   * becomes a bit-shift of 1, while a ratio of 1 is a bit-shift of 0.
   *
   * @author Brion Vibber <brion@pobox.com>
   * @copyright 2016
   * @license MIT-style
   *
   * @param {number} ratio - the integer ratio to convert.
   * @returns {number} - number of bits to shift to multiply/divide by the ratio.
   * @throws exception if given a non-power-of-two
   */
  function depower(ratio) {
    var shiftCount = 0,
      n = ratio >> 1;
    while (n != 0) {
      n = n >> 1;
      shiftCount++
    }
    if (ratio !== (1 << shiftCount)) {
      throw 'chroma plane dimensions must be power of 2 ratio to luma plane dimensions; got ' + ratio;
    }
    return shiftCount;
  }

  module.exports = depower;
})();

},{}],9:[function(require,module,exports){
/*
Copyright (c) 2014-2016 Brion Vibber <brion@pobox.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
MPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
(function() {
  "use strict";

  var FrameSink = require('./FrameSink.js'),
    SoftwareFrameSink = require('./SoftwareFrameSink.js'),
    WebGLFrameSink = require('./WebGLFrameSink.js');

  /**
   * @typedef {Object} YUVCanvasOptions
   * @property {boolean} webGL - Whether to use WebGL to draw to the canvas and accelerate color space conversion. If left out, defaults to auto-detect.
   */

  var YUVCanvas = {
    FrameSink: FrameSink,

    SoftwareFrameSink: SoftwareFrameSink,

    WebGLFrameSink: WebGLFrameSink,

    /**
     * Attach a suitable FrameSink instance to an HTML5 canvas element.
     *
     * This will take over the drawing context of the canvas and may turn
     * it into a WebGL 3d canvas if possible. Do not attempt to use the
     * drawing context directly after this.
     *
     * @param {HTMLCanvasElement} canvas - HTML canvas element to attach to
     * @param {YUVCanvasOptions} options - map of options
     * @returns {FrameSink} - instance of suitable subclass.
     */
    attach: function(canvas, options) {
      options = options || {};
      var webGL = ('webGL' in options) ? options.webGL : WebGLFrameSink.isAvailable();
      if (webGL) {
        return new WebGLFrameSink(canvas, options);
      } else {
        return new SoftwareFrameSink(canvas, options);
      }
    }
  };

  module.exports = YUVCanvas;
})();

},{"./FrameSink.js":4,"./SoftwareFrameSink.js":5,"./WebGLFrameSink.js":6}]},{},[2]);
