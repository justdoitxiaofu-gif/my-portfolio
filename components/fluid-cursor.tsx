"use client";

import { useEffect, useRef } from "react";

// WebGL Fluid Simulation - 鼠标流体跟随效果
// 基于 Navier-Stokes 方程简化版，GPU 加速

export default function FluidCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 移动端降级：检测设备性能
    const isMobile = /Mobile|Android|iPhone/i.test(navigator.userAgent);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    // 移动端使用更小的分辨率
    const SIM_RESOLUTION = isMobile ? 64 : 128;
    const DYE_RESOLUTION = isMobile ? 256 : 512;
    const SPLAT_RADIUS = isMobile ? 0.3 : 0.25;
    const CURL = 20;
    const PRESSURE_ITERATIONS = isMobile ? 12 : 20;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) return;

    // 扩展
    const extHalfFloat = gl.getExtension("OES_texture_half_float");
    const extLinear = gl.getExtension("OES_texture_half_float_linear");
    const halfFloatType = extHalfFloat ? extHalfFloat.HALF_FLOAT_OES : gl.UNSIGNED_BYTE;

    // 检查是否支持渲染到 half float 纹理
    let supportLinearFiltering = !!extLinear;
    let formatRGBA: { internalFormat: number; format: number };
    let formatRG: { internalFormat: number; format: number };
    let formatR: { internalFormat: number; format: number };

    formatRGBA = { internalFormat: gl.RGBA, format: gl.RGBA };
    formatRG = { internalFormat: gl.RGBA, format: gl.RGBA };
    formatR = { internalFormat: gl.RGBA, format: gl.RGBA };

    // Resize
    function resizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio, isMobile ? 1 : 2);
      canvas!.width = canvas!.clientWidth * dpr;
      canvas!.height = canvas!.clientHeight * dpr;
    }
    resizeCanvas();

    // Shader 编译
    function compileShader(type: number, source: string) {
      const shader = gl!.createShader(type)!;
      gl!.shaderSource(shader, source);
      gl!.compileShader(shader);
      if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
        console.error(gl!.getShaderInfoLog(shader));
        return null;
      }
      return shader;
    }

    function createProgram(vertSource: string, fragSource: string) {
      const program = gl!.createProgram()!;
      const vert = compileShader(gl!.VERTEX_SHADER, vertSource)!;
      const frag = compileShader(gl!.FRAGMENT_SHADER, fragSource)!;
      gl!.attachShader(program, vert);
      gl!.attachShader(program, frag);
      gl!.linkProgram(program);
      if (!gl!.getProgramParameter(program, gl!.LINK_STATUS)) {
        console.error(gl!.getProgramInfoLog(program));
      }
      return program;
    }

    // 顶点着色器
    const baseVertexShader = `
      attribute vec2 aPosition;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform vec2 texelSize;
      void main() {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    // Fragment shaders
    const splatShader = `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uTarget;
      uniform float aspectRatio;
      uniform vec3 color;
      uniform vec2 point;
      uniform float radius;
      void main() {
        vec2 p = vUv - point;
        p.x *= aspectRatio;
        vec3 splat = exp(-dot(p, p) / radius) * color;
        vec3 base = texture2D(uTarget, vUv).xyz;
        gl_FragColor = vec4(base + splat, 1.0);
      }
    `;

    const advectionShader = `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uVelocity;
      uniform sampler2D uSource;
      uniform vec2 texelSize;
      uniform float dt;
      uniform float dissipation;
      void main() {
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        vec4 result = dissipation * texture2D(uSource, coord);
        gl_FragColor = result;
      }
    `;

    const divergenceShader = `
      precision highp float;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uVelocity;
      void main() {
        float L = texture2D(uVelocity, vL).x;
        float R = texture2D(uVelocity, vR).x;
        float T = texture2D(uVelocity, vT).y;
        float B = texture2D(uVelocity, vB).y;
        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
      }
    `;

    const curlShader = `
      precision highp float;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uVelocity;
      void main() {
        float L = texture2D(uVelocity, vL).y;
        float R = texture2D(uVelocity, vR).y;
        float T = texture2D(uVelocity, vT).x;
        float B = texture2D(uVelocity, vB).x;
        float vorticity = R - L - T + B;
        gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
      }
    `;

    const vorticityShader = `
      precision highp float;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uVelocity;
      uniform sampler2D uCurl;
      uniform float curl;
      uniform float dt;
      void main() {
        float L = texture2D(uCurl, vL).x;
        float R = texture2D(uCurl, vR).x;
        float T = texture2D(uCurl, vT).x;
        float B = texture2D(uCurl, vB).x;
        float C = texture2D(uCurl, vUv).x;
        vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        force /= length(force) + 0.0001;
        force *= curl * C;
        force.y *= -1.0;
        vec2 vel = texture2D(uVelocity, vUv).xy;
        gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
      }
    `;

    const pressureShader = `
      precision highp float;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uDivergence;
      void main() {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        float C = texture2D(uPressure, vUv).x;
        float divergence = texture2D(uDivergence, vUv).x;
        float pressure = (L + R + B + T - divergence) * 0.25;
        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
      }
    `;

    const gradientSubtractShader = `
      precision highp float;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uVelocity;
      void main() {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity.xy -= vec2(R - L, T - B);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
      }
    `;

    const displayShader = `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uTexture;
      void main() {
        vec3 c = texture2D(uTexture, vUv).rgb;
        float a = max(c.r, max(c.g, c.b));
        gl_FragColor = vec4(c, a * 0.92);
      }
    `;

    const clearShader = `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uTexture;
      uniform float value;
      void main() {
        gl_FragColor = value * texture2D(uTexture, vUv);
      }
    `;

    // 编译所有程序
    const splatProgram = createProgram(baseVertexShader, splatShader);
    const advectionProgram = createProgram(baseVertexShader, advectionShader);
    const divergenceProgram = createProgram(baseVertexShader, divergenceShader);
    const curlProgram = createProgram(baseVertexShader, curlShader);
    const vorticityProgram = createProgram(baseVertexShader, vorticityShader);
    const pressureProgram = createProgram(baseVertexShader, pressureShader);
    const gradientSubtractProgram = createProgram(baseVertexShader, gradientSubtractShader);
    const displayProgram = createProgram(baseVertexShader, displayShader);
    const clearProgram = createProgram(baseVertexShader, clearShader);

    // 全屏 quad
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    const index = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);

    // Framebuffer Object 创建
    function createFBO(w: number, h: number, filtering: number) {
      const texture = gl!.createTexture()!;
      gl!.bindTexture(gl!.TEXTURE_2D, texture);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, filtering);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, filtering);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, w, h, 0, gl!.RGBA, halfFloatType, null);

      const fbo = gl!.createFramebuffer()!;
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo);
      gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, texture, 0);
      gl!.viewport(0, 0, w, h);
      gl!.clear(gl!.COLOR_BUFFER_BIT);

      return { texture, fbo, width: w, height: h };
    }

    function createDoubleFBO(w: number, h: number, filtering: number) {
      let fbo1 = createFBO(w, h, filtering);
      let fbo2 = createFBO(w, h, filtering);
      return {
        get read() { return fbo1; },
        get write() { return fbo2; },
        swap() { const temp = fbo1; fbo1 = fbo2; fbo2 = temp; },
      };
    }

    // 初始化 FBOs
    const filtering = supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
    let velocity = createDoubleFBO(SIM_RESOLUTION, SIM_RESOLUTION, filtering);
    let dye = createDoubleFBO(DYE_RESOLUTION, DYE_RESOLUTION, filtering);
    let divergenceFBO = createFBO(SIM_RESOLUTION, SIM_RESOLUTION, gl.NEAREST);
    let curlFBO = createFBO(SIM_RESOLUTION, SIM_RESOLUTION, gl.NEAREST);
    let pressure = createDoubleFBO(SIM_RESOLUTION, SIM_RESOLUTION, gl.NEAREST);

    // 绘制工具函数
    function blit(target: { fbo: WebGLFramebuffer; width: number; height: number } | null) {
      if (target) {
        gl!.bindFramebuffer(gl!.FRAMEBUFFER, target.fbo);
        gl!.viewport(0, 0, target.width, target.height);
      } else {
        gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
        gl!.viewport(0, 0, gl!.drawingBufferWidth, gl!.drawingBufferHeight);
      }
      gl!.drawElements(gl!.TRIANGLES, 6, gl!.UNSIGNED_SHORT, 0);
    }

    // 鼠标状态
    let pointer = { x: 0, y: 0, dx: 0, dy: 0, moved: false, down: false };
    let lastTime = Date.now();

    // 生成柔和的金色/琥珀色调（匹配网站主题）
    function generateColor(): [number, number, number] {
      const hue = 35 + Math.random() * 25; // 金色范围 35-60
      const sat = 0.5 + Math.random() * 0.3;
      const val = 0.15 + Math.random() * 0.1;
      // HSV to RGB
      const h = hue / 60;
      const i = Math.floor(h);
      const f = h - i;
      const p = val * (1 - sat);
      const q = val * (1 - sat * f);
      const t = val * (1 - sat * (1 - f));
      let r = 0, g = 0, b = 0;
      switch (i % 6) {
        case 0: r = val; g = t; b = p; break;
        case 1: r = q; g = val; b = p; break;
        case 2: r = p; g = val; b = t; break;
        case 3: r = p; g = q; b = val; break;
        case 4: r = t; g = p; b = val; break;
        case 5: r = val; g = p; b = q; break;
      }
      return [r, g, b];
    }

    function splat(x: number, y: number, dx: number, dy: number) {
      const program = splatProgram;
      gl!.useProgram(program);

      gl!.uniform1i(gl!.getUniformLocation(program, "uTarget"), 0);
      gl!.uniform1f(gl!.getUniformLocation(program, "aspectRatio"), canvas!.width / canvas!.height);
      gl!.uniform2f(gl!.getUniformLocation(program, "point"), x, y);
      gl!.uniform1f(gl!.getUniformLocation(program, "radius"), SPLAT_RADIUS / 100.0);

      // Velocity splat
      gl!.activeTexture(gl!.TEXTURE0);
      gl!.bindTexture(gl!.TEXTURE_2D, velocity.read.texture);
      gl!.uniform3f(gl!.getUniformLocation(program, "color"), dx, dy, 0.0);
      blit(velocity.write);
      velocity.swap();

      // Dye splat
      gl!.bindTexture(gl!.TEXTURE_2D, dye.read.texture);
      const color = generateColor();
      gl!.uniform3f(gl!.getUniformLocation(program, "color"), color[0], color[1], color[2]);
      blit(dye.write);
      dye.swap();
    }

    function step(dt: number) {
      // Bind quad
      gl!.bindBuffer(gl!.ARRAY_BUFFER, quad);
      gl!.bindBuffer(gl!.ELEMENT_ARRAY_BUFFER, index);
      const aPos = 0;

      // Curl
      gl!.useProgram(curlProgram);
      gl!.enableVertexAttribArray(aPos);
      gl!.vertexAttribPointer(aPos, 2, gl!.FLOAT, false, 0, 0);
      gl!.uniform2f(gl!.getUniformLocation(curlProgram, "texelSize"), 1.0 / SIM_RESOLUTION, 1.0 / SIM_RESOLUTION);
      gl!.uniform1i(gl!.getUniformLocation(curlProgram, "uVelocity"), 0);
      gl!.activeTexture(gl!.TEXTURE0);
      gl!.bindTexture(gl!.TEXTURE_2D, velocity.read.texture);
      blit(curlFBO);

      // Vorticity
      gl!.useProgram(vorticityProgram);
      gl!.enableVertexAttribArray(aPos);
      gl!.vertexAttribPointer(aPos, 2, gl!.FLOAT, false, 0, 0);
      gl!.uniform2f(gl!.getUniformLocation(vorticityProgram, "texelSize"), 1.0 / SIM_RESOLUTION, 1.0 / SIM_RESOLUTION);
      gl!.uniform1i(gl!.getUniformLocation(vorticityProgram, "uVelocity"), 0);
      gl!.uniform1i(gl!.getUniformLocation(vorticityProgram, "uCurl"), 1);
      gl!.uniform1f(gl!.getUniformLocation(vorticityProgram, "curl"), CURL);
      gl!.uniform1f(gl!.getUniformLocation(vorticityProgram, "dt"), dt);
      gl!.activeTexture(gl!.TEXTURE0);
      gl!.bindTexture(gl!.TEXTURE_2D, velocity.read.texture);
      gl!.activeTexture(gl!.TEXTURE1);
      gl!.bindTexture(gl!.TEXTURE_2D, curlFBO.texture);
      blit(velocity.write);
      velocity.swap();

      // Divergence
      gl!.useProgram(divergenceProgram);
      gl!.enableVertexAttribArray(aPos);
      gl!.vertexAttribPointer(aPos, 2, gl!.FLOAT, false, 0, 0);
      gl!.uniform2f(gl!.getUniformLocation(divergenceProgram, "texelSize"), 1.0 / SIM_RESOLUTION, 1.0 / SIM_RESOLUTION);
      gl!.uniform1i(gl!.getUniformLocation(divergenceProgram, "uVelocity"), 0);
      gl!.activeTexture(gl!.TEXTURE0);
      gl!.bindTexture(gl!.TEXTURE_2D, velocity.read.texture);
      blit(divergenceFBO);

      // Clear pressure
      gl!.useProgram(clearProgram);
      gl!.enableVertexAttribArray(aPos);
      gl!.vertexAttribPointer(aPos, 2, gl!.FLOAT, false, 0, 0);
      gl!.uniform1i(gl!.getUniformLocation(clearProgram, "uTexture"), 0);
      gl!.uniform1f(gl!.getUniformLocation(clearProgram, "value"), 0.8);
      gl!.activeTexture(gl!.TEXTURE0);
      gl!.bindTexture(gl!.TEXTURE_2D, pressure.read.texture);
      blit(pressure.write);
      pressure.swap();

      // Pressure solve
      gl!.useProgram(pressureProgram);
      gl!.enableVertexAttribArray(aPos);
      gl!.vertexAttribPointer(aPos, 2, gl!.FLOAT, false, 0, 0);
      gl!.uniform2f(gl!.getUniformLocation(pressureProgram, "texelSize"), 1.0 / SIM_RESOLUTION, 1.0 / SIM_RESOLUTION);
      gl!.uniform1i(gl!.getUniformLocation(pressureProgram, "uDivergence"), 1);
      gl!.activeTexture(gl!.TEXTURE1);
      gl!.bindTexture(gl!.TEXTURE_2D, divergenceFBO.texture);
      for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
        gl!.uniform1i(gl!.getUniformLocation(pressureProgram, "uPressure"), 0);
        gl!.activeTexture(gl!.TEXTURE0);
        gl!.bindTexture(gl!.TEXTURE_2D, pressure.read.texture);
        blit(pressure.write);
        pressure.swap();
      }

      // Gradient subtract
      gl!.useProgram(gradientSubtractProgram);
      gl!.enableVertexAttribArray(aPos);
      gl!.vertexAttribPointer(aPos, 2, gl!.FLOAT, false, 0, 0);
      gl!.uniform2f(gl!.getUniformLocation(gradientSubtractProgram, "texelSize"), 1.0 / SIM_RESOLUTION, 1.0 / SIM_RESOLUTION);
      gl!.uniform1i(gl!.getUniformLocation(gradientSubtractProgram, "uPressure"), 0);
      gl!.uniform1i(gl!.getUniformLocation(gradientSubtractProgram, "uVelocity"), 1);
      gl!.activeTexture(gl!.TEXTURE0);
      gl!.bindTexture(gl!.TEXTURE_2D, pressure.read.texture);
      gl!.activeTexture(gl!.TEXTURE1);
      gl!.bindTexture(gl!.TEXTURE_2D, velocity.read.texture);
      blit(velocity.write);
      velocity.swap();

      // Advect velocity
      gl!.useProgram(advectionProgram);
      gl!.enableVertexAttribArray(aPos);
      gl!.vertexAttribPointer(aPos, 2, gl!.FLOAT, false, 0, 0);
      gl!.uniform2f(gl!.getUniformLocation(advectionProgram, "texelSize"), 1.0 / SIM_RESOLUTION, 1.0 / SIM_RESOLUTION);
      gl!.uniform1i(gl!.getUniformLocation(advectionProgram, "uVelocity"), 0);
      gl!.uniform1i(gl!.getUniformLocation(advectionProgram, "uSource"), 0);
      gl!.uniform1f(gl!.getUniformLocation(advectionProgram, "dt"), dt);
      gl!.uniform1f(gl!.getUniformLocation(advectionProgram, "dissipation"), 0.97);
      gl!.activeTexture(gl!.TEXTURE0);
      gl!.bindTexture(gl!.TEXTURE_2D, velocity.read.texture);
      blit(velocity.write);
      velocity.swap();

      // Advect dye
      gl!.uniform2f(gl!.getUniformLocation(advectionProgram, "texelSize"), 1.0 / DYE_RESOLUTION, 1.0 / DYE_RESOLUTION);
      gl!.uniform1i(gl!.getUniformLocation(advectionProgram, "uVelocity"), 0);
      gl!.uniform1i(gl!.getUniformLocation(advectionProgram, "uSource"), 1);
      gl!.uniform1f(gl!.getUniformLocation(advectionProgram, "dissipation"), 0.96);
      gl!.activeTexture(gl!.TEXTURE0);
      gl!.bindTexture(gl!.TEXTURE_2D, velocity.read.texture);
      gl!.activeTexture(gl!.TEXTURE1);
      gl!.bindTexture(gl!.TEXTURE_2D, dye.read.texture);
      blit(dye.write);
      dye.swap();
    }

    function render() {
      gl!.bindBuffer(gl!.ARRAY_BUFFER, quad);
      gl!.bindBuffer(gl!.ELEMENT_ARRAY_BUFFER, index);
      const aPos = 0;
      gl!.useProgram(displayProgram);
      gl!.enableVertexAttribArray(aPos);
      gl!.vertexAttribPointer(aPos, 2, gl!.FLOAT, false, 0, 0);
      gl!.uniform2f(gl!.getUniformLocation(displayProgram, "texelSize"), 1.0 / canvas!.width, 1.0 / canvas!.height);
      gl!.uniform1i(gl!.getUniformLocation(displayProgram, "uTexture"), 0);
      gl!.activeTexture(gl!.TEXTURE0);
      gl!.bindTexture(gl!.TEXTURE_2D, dye.read.texture);
      blit(null);
    }

    // 主循环
    let animId = 0;
    function update() {
      const now = Date.now();
      let dt = (now - lastTime) / 1000;
      dt = Math.min(dt, 0.016); // Cap at 60fps
      lastTime = now;

      if (pointer.moved) {
        pointer.moved = false;
        splat(pointer.x, pointer.y, pointer.dx * 10.0, pointer.dy * 10.0);
      }

      step(dt);
      render();
      animId = requestAnimationFrame(update);
    }

    // 事件监听
    function onMouseMove(e: MouseEvent) {
      const x = e.clientX / window.innerWidth;
      const y = 1.0 - e.clientY / window.innerHeight;
      const dx = (x - pointer.x) * 3.0;
      const dy = (y - pointer.y) * 3.0;

      if (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001) {
        pointer.dx = dx;
        pointer.dy = dy;
        pointer.moved = true;
      }
      pointer.x = x;
      pointer.y = y;
    }

    function onTouchMove(e: TouchEvent) {
      const touch = e.touches[0];
      const x = touch.clientX / window.innerWidth;
      const y = 1.0 - touch.clientY / window.innerHeight;
      const dx = (x - pointer.x) * 5.0;
      const dy = (y - pointer.y) * 5.0;

      if (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001) {
        pointer.dx = dx;
        pointer.dy = dy;
        pointer.moved = true;
      }
      pointer.x = x;
      pointer.y = y;
    }

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    // Resize observer
    const observer = new ResizeObserver(() => {
      resizeCanvas();
    });
    observer.observe(canvas);

    // 启动
    update();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full z-[5] pointer-events-auto"
      style={{ 
        pointerEvents: "none",
        mixBlendMode: "screen",
      }}
    />
  );
}
