"use client";

import React, { FC, useRef, useEffect, useState } from "react";

export interface LiquidCrystalProps {
  speed?: number;
  radii?: [number, number, number];
  smoothK?: [number, number];
  className?: string;
}

// Custom shader adapted for GYM SYSTEM teal/cyan palette
export const liquidCrystalShader = `#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_speed;
uniform vec3 u_radii;
uniform vec2 u_smoothK;
out vec4 fragColor;

float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

float opSmoothUnion(float d1, float d2, float k) {
  float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}

float mapScene(vec2 uv) {
  float t = u_time * u_speed;
  vec2 p1 = vec2(cos(t * 0.5), sin(t * 0.5)) * 0.3;
  vec2 p2 = vec2(cos(t * 0.7 + 2.1), sin(t * 0.6 + 2.1)) * 0.4;
  vec2 p3 = vec2(cos(t * 0.4 + 4.2), sin(t * 0.8 + 4.2)) * 0.35;

  float b1 = sdCircle(uv - p1, u_radii.x);
  float b2 = sdCircle(uv - p2, u_radii.y);
  float b3 = sdCircle(uv - p3, u_radii.z);

  float u12 = opSmoothUnion(b1, b2, u_smoothK.x);
  return opSmoothUnion(u12, b3, u_smoothK.y);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
  float d = mapScene(uv);

  // Teal/cyan color palette for GYM SYSTEM
  vec3 base = vec3(0.008 / abs(d));
  vec3 teal = vec3(0.0, 0.83, 0.67);    // #00d4aa
  vec3 cyan = vec3(0.0, 0.6, 0.8);      // #0099cc
  vec3 dark = vec3(0.04, 0.04, 0.06);   // #0a0a0f

  float t = u_time * 0.3;
  vec3 pha = mix(teal, cyan, 0.5 + 0.5 * sin(t + uv.x * 2.0));
  pha = mix(pha, vec3(0.0, 0.9, 0.75), 0.3 * sin(t * 0.7 + uv.y * 3.0));

  vec3 col = clamp(base * pha * 0.6, 0.0, 1.0);

  // Darken edges for vignette
  float vig = 1.0 - dot(uv * 0.8, uv * 0.8);
  col *= clamp(vig, 0.0, 1.0);

  // Mix with dark background
  col = mix(dark, col, 0.85);

  fragColor = vec4(col, 1.0);
}
`;

const LiquidCrystalBackground: FC<LiquidCrystalProps> = ({
  speed = 0.5,
  radii = [0.2, 0.15, 0.22],
  smoothK = [0.2, 0.25],
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2");
    if (!gl) {
      setError("WebGL2 not supported");
      return;
    }

    class Renderer {
      prog: any;
      uRes: any;
      uTime: any;
      uSpeed: any;
      uRadii: any;
      uK: any;
      buf: any;

      constructor() {
        const compile = (type: number, src: string) => {
          const s = gl.createShader(type)!;
          gl.shaderSource(s, src);
          gl.compileShader(s);
          if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(s));
            gl.deleteShader(s);
            return null;
          }
          return s;
        };

        const vsSrc = `#version 300 es
        in vec2 position;
        void main() {
          gl_Position = vec4(position, 0.0, 1.0);
        }`;
        const vs = compile(gl.VERTEX_SHADER, vsSrc)!;
        const fs = compile(gl.FRAGMENT_SHADER, liquidCrystalShader)!;

        this.prog = gl.createProgram()!;
        gl.attachShader(this.prog, vs);
        gl.attachShader(this.prog, fs);
        gl.linkProgram(this.prog);
        if (!gl.getProgramParameter(this.prog, gl.LINK_STATUS)) {
          console.error(gl.getProgramInfoLog(this.prog));
        }

        const quadVerts = new Float32Array([-1,1, -1,-1, 1,1, 1,-1]);
        this.buf = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
        gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);
        const posLoc = gl.getAttribLocation(this.prog, "position");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        this.uRes    = gl.getUniformLocation(this.prog, "u_resolution")!;
        this.uTime   = gl.getUniformLocation(this.prog, "u_time")!;
        this.uSpeed  = gl.getUniformLocation(this.prog, "u_speed")!;
        this.uRadii  = gl.getUniformLocation(this.prog, "u_radii")!;
        this.uK      = gl.getUniformLocation(this.prog, "u_smoothK")!;
      }

      render(timeMs: number) {
        const w = gl.canvas.width;
        const h = gl.canvas.height;
        gl.viewport(0, 0, w, h);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.prog);
        gl.uniform2f(this.uRes, w, h);
        gl.uniform1f(this.uTime, timeMs * 0.001);
        gl.uniform1f(this.uSpeed, speed);
        gl.uniform3fv(this.uRadii, radii);
        gl.uniform2fv(this.uK, smoothK);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }

    const renderer = new Renderer();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = canvas.clientWidth  * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    window.addEventListener("resize", resize);
    resize();

    let rafId: number;
    const animate = (t: number) => {
      renderer.render(t);
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafId);
    };
  }, [speed, radii, smoothK]);

  return (
    <div
      role="region"
      aria-label="Animated background"
      className={`relative w-full h-full overflow-hidden ${className}`}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
      {error && (
        <div className="absolute inset-0 bg-[#0a0a0f] flex items-center justify-center">
          {/* Fallback gradient when WebGL not available */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#00d4aa]/10 to-[#0a0a0f]" />
        </div>
      )}
    </div>
  );
};

export default LiquidCrystalBackground;
