/**
 * Testbed from original source:
 * https://github.com/shakiba/planck.js/blob/456a47228802bb5a5a8c406903e33691e5024a26/testbed/index.js
 */
/* eslint no-param-reassign: 0, no-underscore-dangle: 0, no-bitwise: 0, no-use-before-define: 0 */
import planck from 'planck-js';
import Stage from 'stage-js/platform/web';

// x, y, width, height: camera position
// hz, speed: frequency and speed of simulation
// background: background color
// step: function, is always called
// paint: function, is called only after repaint

const { Vec2 } = planck;

export default (opts, callback) => {
  if (typeof opts === 'function') {
    callback = opts;
    opts = null;
  }

  Stage((stage, canvas) => {
    stage.on(Stage.Mouse.START, () => {
      window.focus();
      if (document.activeElement) document.activeElement.blur();
      canvas.focus();
    });

    stage.MAX_ELAPSE = 1000 / 30;

    const testbed = {};

    let paused = false;
    stage.on('resume', () => {
      paused = false;
      if (testbed._resume) testbed._resume();
    });
    stage.on('pause', () => {
      paused = true;
      if (testbed._pause) testbed._pause();
    });
    testbed.isPaused = () => paused;
    testbed.togglePause = () => (paused ? testbed.play() : testbed.pause());
    testbed.pause = () => stage.pause();
    testbed.resume = () => {
      stage.resume();
      testbed.focus();
    };
    testbed.focus = () => {
      if (document.activeElement) document.activeElement.blur();
      canvas.focus();
    };

    testbed.focus = () => {
      if (document.activeElement) document.activeElement.blur();
      canvas.focus();
    };

    testbed.debug = false;
    testbed.width = 80;
    testbed.height = 60;
    testbed.x = 0;
    testbed.y = -10;
    testbed.ratio = 16;
    testbed.hz = 60;
    testbed.speed = 1;
    testbed.activeKeys = {};
    testbed.background = '#222222';

    let statusText = '';
    const statusMap = {};

    function statusSet(name, value) {
      if (typeof value !== 'function' && typeof value !== 'object') {
        statusMap[name] = value;
      }
    }

    function statusMerge(obj) {
      Object.entries(obj).forEach(([key, value]) => statusSet(key, value));
    }

    testbed.status = (a, b) => {
      if (typeof b !== 'undefined') {
        statusSet(a, b);
      } else if (a && typeof a === 'object') {
        statusMerge(a);
      } else if (typeof a === 'string') {
        statusText = a;
      }

      if (testbed._status) testbed._status(statusText, statusMap);
    };

    testbed.info = text => (testbed._info && testbed._info(text));

    let lastDrawHash = '';
    let drawHash = '';

    (() => {
      const drawingTexture = new Stage.Texture();
      stage.append(Stage.image(drawingTexture));

      const buffer = [];
      stage.tick(() => {
        buffer.length = 0;
      }, true);

      drawingTexture.draw = ctx => {
        ctx.save();
        ctx.transform(1, 0, 0, -1, -testbed.x, -testbed.y);
        ctx.lineWidth = 2 / testbed.ratio;
        ctx.lineCap = 'round';
        for (let drawing = buffer.shift(); drawing; drawing = buffer.shift()) {
          drawing(ctx, testbed.ratio);
        }
        ctx.restore();
      };

      testbed.drawPoint = (p, r, color) => {
        buffer.push((ctx, ratio) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5 / ratio, 0, 2 * Math.PI);
          ctx.strokeStyle = color;
          ctx.stroke();
        });
        drawHash += `point${p.x},${p.y},${r},${color}`;
      };

      testbed.drawCircle = (p, r, color) => {
        buffer.push(ctx => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, 2 * Math.PI);
          ctx.strokeStyle = color;
          ctx.stroke();
        });
        drawHash += `circle${p.x},${p.y},${r},${color}`;
      };

      testbed.drawSegment = (a, b, color) => {
        buffer.push(ctx => {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = color;
          ctx.stroke();
        });
        drawHash += `segment${a.x},${a.y},${b.x},${b.y},${color}`;
      };

      testbed.drawPolygon = (points, color) => {
        if (!points || !points.length) {
          return;
        }
        buffer.push(ctx => {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i += 1) {
            ctx.lineTo(points[i].x, points[i].y);
          }
          ctx.strokeStyle = color;
          ctx.closePath();
          ctx.stroke();
        });
        drawHash += 'segment';
        for (let i = 1; i < points.length; i += 1) {
          drawHash += `${points[i].x},${points[i].y},`;
        }
        drawHash += color;
      };

      testbed.drawAABB = (aabb, color) => {
        buffer.push(ctx => {
          ctx.beginPath();
          ctx.moveTo(aabb.lowerBound.x, aabb.lowerBound.y);
          ctx.lineTo(aabb.upperBound.x, aabb.lowerBound.y);
          ctx.lineTo(aabb.upperBound.x, aabb.upperBound.y);
          ctx.lineTo(aabb.lowerBound.x, aabb.upperBound.y);
          ctx.strokeStyle = color;
          ctx.closePath();
          ctx.stroke();
        });
        drawHash += 'aabb';
        drawHash += `${aabb.lowerBound.x},${aabb.lowerBound.y},`;
        drawHash += `${aabb.upperBound.x},${aabb.upperBound.y},`;
        drawHash += color;
      };

      testbed.color = (r, g, b) => {
        r = r * 256 | 0;
        g = g * 256 | 0;
        b = b * 256 | 0;
        return `rgb(${r},${g},${b})`;
      };

      testbed.stage = stage;
    })();

    const world = callback(testbed);

    const viewer = new Viewer(world, testbed);

    let lastX = 0;
    let lastY = 0;
    stage.tick(() => {
      // update camera position
      if (lastX !== testbed.x || lastY !== testbed.y) {
        viewer.offset(-testbed.x, -testbed.y);
        lastX = testbed.x;
        lastY = testbed.y;
      }
    });

    viewer.tick((dt, t) => {
      // call testbed step, if provided
      if (typeof testbed.step === 'function') {
        testbed.step(dt, t);
      }

      if (targetBody) {
        testbed.drawSegment(targetBody.getPosition(), mouseMove, 'rgba(255,255,255,0.2)');
      }

      if (lastDrawHash !== drawHash) {
        lastDrawHash = drawHash;
        stage.touch();
      }
      drawHash = '';

      return true;
    });

    viewer.scale(1, -1);

    // stage.empty();
    stage.background(testbed.background);
    stage.viewbox(testbed.width, testbed.height);
    stage.pin('alignX', -0.5);
    stage.pin('alignY', -0.5);
    stage.prepend(viewer);

    function findBody(point) {
      let body;
      const aabb = planck.AABB(point, point);
      world.queryAABB(aabb, fixture => {
        if (body) {
          return null;
        }
        if (!fixture.getBody().isDynamic() || !fixture.testPoint(point)) {
          return null;
        }
        body = fixture.getBody();
        return true;
      });
      return body;
    }

    const mouseGround = world.createBody();
    let mouseJoint;

    let targetBody;
    const mouseMove = { x: 0, y: 0 };

    viewer.attr('spy', true)
      .on(Stage.Mouse.START, point => {
        if (targetBody) {
          return;
        }

        const body = findBody(point);
        if (!body) {
          return;
        }

        if (testbed.mouseForce) {
          targetBody = body;
        } else {
          mouseJoint = planck.MouseJoint({ maxForce: 1000 }, mouseGround, body, Vec2(point));
          world.createJoint(mouseJoint);
        }
      })
      .on(Stage.Mouse.MOVE, point => {
        if (mouseJoint) {
          mouseJoint.setTarget(point);
        }

        mouseMove.x = point.x;
        mouseMove.y = point.y;
      })
      .on(Stage.Mouse.END, point => {
        if (mouseJoint) {
          world.destroyJoint(mouseJoint);
          mouseJoint = null;
        }
        if (targetBody) {
          const force = Vec2.sub(point, targetBody.getPosition());
          targetBody.applyForceToCenter(force.mul(testbed.mouseForce), true);
          targetBody = null;
        }
      })
      .on(Stage.Mouse.CANCEL, () => {
        if (mouseJoint) {
          world.destroyJoint(mouseJoint);
          mouseJoint = null;
        }
        if (targetBody) {
          targetBody = null;
        }
      });

    window.addEventListener('keydown', e => {
      switch (e.keyCode) {
        case 'P'.charCodeAt(0):
          testbed.togglePause();
          break;
        default:
          break;
      }
    }, false);

    const downKeys = {};
    window.addEventListener('keydown', e => {
      const { keyCode } = e;
      downKeys[keyCode] = true;
      updateActiveKeys(keyCode, true);
      if (testbed.keydown) testbed.keydown(keyCode, String.fromCharCode(keyCode));
    });
    window.addEventListener('keyup', e => {
      const { keyCode } = e;
      downKeys[keyCode] = false;
      updateActiveKeys(keyCode, false);
      if (testbed.keyup) testbed.keyup(keyCode, String.fromCharCode(keyCode));
    });

    const { activeKeys } = testbed;
    function updateActiveKeys(keyCode, down) {
      const char = String.fromCharCode(keyCode);
      if (/\w/.test(char)) {
        activeKeys[char] = down;
      }
      activeKeys.right = downKeys[39] || activeKeys.D;
      activeKeys.left = downKeys[37] || activeKeys.A;
      activeKeys.up = downKeys[38] || activeKeys.W;
      activeKeys.down = downKeys[40] || activeKeys.S;
      activeKeys.fire = downKeys[32] || downKeys[13];
    }
  });
};

Viewer._super = Stage;
Viewer.prototype = Stage._create(Viewer._super.prototype);

function Viewer(world, opts) {
  Viewer._super.call(this);
  this.label('Planck');

  opts = opts || {};

  this._options = {};
  const options = this._options;
  this._options.speed = opts.speed || 1;
  this._options.hz = opts.hz || 60;
  if (Math.abs(this._options.hz) < 1) {
    this._options.hz = 1 / this._options.hz;
  }
  this._options.ratio = opts.ratio || 16;
  this._options.lineWidth = 2 / this._options.ratio;

  this._world = world;

  const timeStep = 1 / this._options.hz;
  let elapsedTime = 0;
  this.tick(dt => {
    dt = dt * 0.001 * options.speed;
    elapsedTime += dt;
    while (elapsedTime > timeStep) {
      world.step(timeStep);
      elapsedTime -= timeStep;
    }
    this.renderWorld();
    return true;
  }, true);

  world.on('remove-fixture', obj => obj.ui && obj.ui.remove());

  world.on('remove-joint', obj => obj.ui && obj.ui.remove());
}

Viewer.prototype.renderWorld = function renderWorld() {
  const world = this._world;
  const viewer = this;

  for (let b = world.getBodyList(); b; b = b.getNext()) {
    for (let f = b.getFixtureList(); f; f = f.getNext()) {
      if (!f.ui) {
        if (f.render && f.render.stroke) {
          this._options.strokeStyle = f.render.stroke;
        } else if (b.render && b.render.stroke) {
          this._options.strokeStyle = b.render.stroke;
        } else if (b.isDynamic()) {
          this._options.strokeStyle = 'rgba(255,255,255,0.9)';
        } else if (b.isKinematic()) {
          this._options.strokeStyle = 'rgba(255,255,255,0.7)';
        } else if (b.isStatic()) {
          this._options.strokeStyle = 'rgba(255,255,255,0.5)';
        }

        if (f.render && f.render.fill) {
          this._options.fillStyle = f.render.fill;
        } else if (b.render && b.render.fill) {
          this._options.fillStyle = b.render.fill;
        } else {
          this._options.fillStyle = '';
        }
      }

      const type = f.getType();
      const shape = f.getShape();
      let ui;
      let changed = false;
      if (type === 'circle' && (!f.ui || !f.ui.__isEqualShape(shape))) {
        ui = viewer.drawCircle(shape, this._options);
        changed = true;
      }
      if (type === 'edge' && (!f.ui || !f.ui.__isEqualShape(shape))) {
        ui = viewer.drawEdge(shape, this._options);
        changed = true;
      }
      if (type === 'polygon' && (!f.ui || !f.ui.__isEqualShape(shape))) {
        ui = viewer.drawPolygon(shape, this._options);
        changed = true;
      }
      if (type === 'chain' && (!f.ui || !f.ui.__isEqualShape(shape))) {
        ui = viewer.drawChain(shape, this._options);
        changed = true;
      }

      if (changed) {
        if (f.ui) {
          f.ui.remove();
        }
        f.ui = ui;
        f.ui.appendTo(viewer);
      }

      if (f.ui) {
        const p = b.getPosition();
        const r = b.getAngle();
        if (f.ui.__lastX !== p.x || f.ui.__lastY !== p.y || f.ui.__lastR !== r) {
          f.ui.__lastX = p.x;
          f.ui.__lastY = p.y;
          f.ui.__lastR = r;
          f.ui.offset(p.x, p.y);
          f.ui.rotate(r);
        }
      }
    }
  }

  for (let j = world.getJointList(); j; j = j.getNext()) {
    const a = j.getAnchorA();
    const b = j.getAnchorB();

    if (!j.ui) {
      this._options.strokeStyle = 'rgba(255,255,255,0.2)';

      j.ui = viewer.drawJoint(j, this._options);
      j.ui.pin('handle', 0.5);
      if (j.ui) {
        j.ui.appendTo(viewer);
      }
    }

    if (j.ui) {
      const cx = (a.x + b.x) * 0.5;
      const cy = (a.y + b.y) * 0.5;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const d = Math.sqrt((dx * dx) + (dy * dy));
      j.ui.width(d);
      j.ui.rotate(Math.atan2(dy, dx));
      j.ui.offset(cx, cy);
    }
  }
};

Viewer.prototype.drawJoint = function drawJoint(joint, options) {
  const lw = options.lineWidth;
  const { ratio } = options;

  const length = 10;

  const texture = Stage.canvas(function draw(ctx) {
    this.size(length + (2 * lw), 2 * lw, ratio);

    ctx.scale(ratio, ratio);
    ctx.beginPath();
    ctx.moveTo(lw, lw);
    ctx.lineTo(lw + length, lw);

    ctx.lineCap = 'round';
    ctx.lineWidth = options.lineWidth;
    ctx.strokeStyle = options.strokeStyle;
    ctx.stroke();
  });

  const image = Stage.image(texture).stretch();
  return image;
};

Viewer.prototype.drawCircle = function drawCircle(shape, options) {
  const lw = options.lineWidth;
  const { ratio } = options;

  const r = shape.m_radius;
  const cx = r + lw;
  const cy = r + lw;
  const w = (r * 2) + (lw * 2);
  const h = (r * 2) + (lw * 2);

  const texture = Stage.canvas(function draw(ctx) {
    this.size(w, h, ratio);

    ctx.scale(ratio, ratio);
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    if (options.fillStyle) {
      ctx.fillStyle = options.fillStyle;
      ctx.fill();
    }
    ctx.lineTo(cx, cy);
    ctx.lineWidth = options.lineWidth;
    ctx.strokeStyle = options.strokeStyle;
    ctx.stroke();
  });
  const { x, y } = shape.m_p;
  const image = Stage.image(texture)
    .offset(x - cx, y - cy);
  const node = Stage.create().append(image);
  node.__isEqualShape = function isEqual(other) {
    return Vec2.areEqual(new Vec2(x, y), other.m_p)
      && r === other.m_radius;
  };
  return node;
};

Viewer.prototype.drawEdge = function drawEdge(edge, options) {
  const lw = options.lineWidth;
  const { ratio } = options;

  const v1 = edge.m_vertex1;
  const v2 = edge.m_vertex2;

  const dx = v2.x - v1.x;
  const dy = v2.y - v1.y;

  const length = Math.sqrt((dx * dx) + (dy * dy));

  const texture = Stage.canvas(function draw(ctx) {
    this.size(length + (2 * lw), 2 * lw, ratio);

    ctx.scale(ratio, ratio);
    ctx.beginPath();
    ctx.moveTo(lw, lw);
    ctx.lineTo(lw + length, lw);

    ctx.lineCap = 'round';
    ctx.lineWidth = options.lineWidth;
    ctx.strokeStyle = options.strokeStyle;
    ctx.stroke();
  });

  const v1x = v1.x;
  const v1y = v1.y;
  const v2x = v2.x;
  const v2y = v2.y;
  const minX = Math.min(v1x, v2x);
  const minY = Math.min(v1y, v2y);

  const image = Stage.image(texture);
  image.rotate(Math.atan2(dy, dx));
  image.offset(minX - lw, minY - lw);
  const node = Stage.create().append(image);
  node.__isEqualShape = function isEqual(other) {
    return Vec2.areEqual(new Vec2(v1x, v1y), other.m_vertex1)
      && Vec2.areEqual(new Vec2(v2x, v2y), other.m_vertex2);
  };
  return node;
};

Viewer.prototype.drawPolygon = function drawPolygon(shape, options) {
  const lw = options.lineWidth;
  const { ratio } = options;

  const vertices = shape.m_vertices;

  if (!vertices.length) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < vertices.length; i += 1) {
    const v = vertices[i];
    minX = Math.min(minX, v.x);
    maxX = Math.max(maxX, v.x);
    minY = Math.min(minY, v.y);
    maxY = Math.max(maxY, v.y);
  }

  const width = maxX - minX;
  const height = maxY - minY;

  const texture = Stage.canvas(function draw(ctx) {
    this.size(width + (2 * lw), height + (2 * lw), ratio);

    ctx.scale(ratio, ratio);
    ctx.beginPath();
    for (let i = 0; i < vertices.length; i += 1) {
      const v = vertices[i];
      const x = (v.x - minX) + lw;
      const y = (v.y - minY) + lw;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    if (vertices.length > 2) {
      ctx.closePath();
    }

    if (options.fillStyle) {
      ctx.fillStyle = options.fillStyle;
      ctx.fill();
      ctx.closePath();
    }

    ctx.lineCap = 'round';
    ctx.lineWidth = options.lineWidth;
    ctx.strokeStyle = options.strokeStyle;
    ctx.stroke();
  });

  const image = Stage.image(texture);
  image.offset(minX - lw, minY - lw);
  const node = Stage.create().append(image);
  const lastVertices = vertices.map(vertex => new Vec2(vertex));
  node.__isEqualShape = function isEqual(other) {
    return lastVertices.length === other.m_vertices.length
      && lastVertices.every((vertex, i) => Vec2.areEqual(vertex, other.m_vertices[i]));
  };
  return node;
};

Viewer.prototype.drawChain = function drawChain(shape, options) {
  const lw = options.lineWidth;
  const { ratio } = options;

  const vertices = shape.m_vertices;

  if (!vertices.length) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < vertices.length; i += 1) {
    const v = vertices[i];
    minX = Math.min(minX, v.x);
    maxX = Math.max(maxX, v.x);
    minY = Math.min(minY, v.y);
    maxY = Math.max(maxY, v.y);
  }

  const width = maxX - minX;
  const height = maxY - minY;

  const texture = Stage.canvas(function draw(ctx) {
    this.size(width + (2 * lw), height + (2 * lw), ratio);

    ctx.scale(ratio, ratio);
    ctx.beginPath();
    for (let i = 0; i < vertices.length; i += 1) {
      const v = vertices[i];
      const x = (v.x - minX) + lw;
      const y = (v.y - minY) + lw;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    // TODO: if loop
    if (vertices.length > 2) {
      // ctx.closePath();
    }

    if (options.fillStyle) {
      ctx.fillStyle = options.fillStyle;
      ctx.fill();
      ctx.closePath();
    }

    ctx.lineCap = 'round';
    ctx.lineWidth = options.lineWidth;
    ctx.strokeStyle = options.strokeStyle;
    ctx.stroke();
  });

  const image = Stage.image(texture);
  image.offset(minX - lw, minY - lw);
  const node = Stage.create().append(image);
  const lastVertices = vertices.map(vertex => new Vec2(vertex));
  node.__isEqualShape = function isEqual(other) {
    return lastVertices.length === other.m_vertices.length
      && lastVertices.every((vertex, i) => Vec2.areEqual(vertex, other.m_vertices[i]));
  };
  return node;
};