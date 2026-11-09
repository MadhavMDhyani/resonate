import { useEffect, useRef } from 'react'
import { useBackground } from '../../stores/backgroundStore'

// Lazy-loaded three.js scene with custom liquid‑blob shader.
// The shader uses vertex noise displacement for wobbling, a fresnel rim, and a gradient
// based on the current theme colours. It respects the background mode store, pauses when
// the tab is hidden or prefers‑reduced‑motion is set, and disposes all resources on unmount.
export default function BackgroundScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mode = useBackground(s => s.mode)

  useEffect(() => {
    if (mode === 'off') return undefined
    let animationId: number | null = null
    let renderer: any
    let scene: any
    let camera: any
    let blobs: any[] = []
    let lastTime = 0
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleVisibility = () => {
      if (document.hidden) cancelAnimation()
      else startAnimation()
    }
    const cancelAnimation = () => {
      if (animationId !== null) cancelAnimationFrame(animationId)
    }
    const startAnimation = () => {
      if (animationId === null) animationId = requestAnimationFrame(tick)
    }
    const tick = (time: number) => {
      const delta = time - lastTime
      // Target ~30fps, skip frames if too fast
      if (delta < 30) {
        animationId = requestAnimationFrame(tick)
        return
      }
      lastTime = time
      // Rotate each blob slowly
      blobs.forEach(b => (b.rotation.y += 0.0005 * delta))
      // Update shader time uniform
      blobs.forEach(b => b.material.uniforms.uTime.value = time * 0.001)
      renderer.render(scene, camera)
      animationId = requestAnimationFrame(tick)
    }

    // Dynamically import three.js to keep the initial bundle small
    import('three').then(THREE => {
      const {
        Scene,
        PerspectiveCamera,
        WebGLRenderer,
        IcosahedronGeometry,
        ShaderMaterial,
        Mesh,
        Color,
        AmbientLight,
        DirectionalLight,
        UniformsUtils,
        Vector2,
      } = THREE

      const canvas = canvasRef.current
      if (!canvas) return

      // Cap devicePixelRatio to avoid huge textures
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
      renderer.setPixelRatio(dpr)
      renderer.setSize(window.innerWidth, window.innerHeight)
      renderer.setClearColor(0x000000, 0) // transparent background

      scene = new Scene()
      camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
      camera.position.set(0, 0, 8)

      // Lights (soft ambient + directional for shading)
      scene.add(new AmbientLight(0xffffff, 0.6))
      const dir = new DirectionalLight(0xffffff, 0.4)
      dir.position.set(5, 5, 5)
      scene.add(dir)

      // Helper to read CSS custom properties (theme colours)
      const getThemeColor = (name: string) => {
        const value = getComputedStyle(document.documentElement).getPropertyValue(name)
        return new Color(value.trim() || '#ffffff')
      }

      // Vertex shader – simple noise‑based displacement
      const vertexShader = `
        uniform float uTime;
        uniform vec2 uResolution;
        varying vec3 vNormal;
        varying vec3 vPosition;
        // Classic 3‑D simplex noise (GLSL port)
        vec3 mod289(vec3 x) {return x - floor(x * (1.0 / 289.0)) * 289.0;}
        vec4 mod289(vec4 x) {return x - floor(x * (1.0 / 289.0)) * 289.0;}
        vec4 permute(vec4 x) {return mod289(((x*34.0)+1.0)*x);
        }
        vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
        float snoise(vec3 v){
          const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
          const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
          // First corner
          vec3 i  = floor(v + dot(v, C.yyy) );
          vec3 x0 = v - i + dot(i, C.xxx) ;
          // Other corners
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min( g.xyz, l.zxy );
          vec3 i2 = max( g.xyz, l.zxy );
          //  x0 = x0 - 0.0 + 0.0 * C
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy; // 0.5 = 1.0/C
          vec3 x3 = x0 - D.xyz;      // -1.0 = -1.0 + 1.0*C
          // Permutations
          i = mod289(i);
          vec4 p = permute( permute( permute(
                     i.z + vec4(0.0, i1.z, i2.z, 1.0))
                   + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                   + i.x + vec4(0.0, i1.x, i2.x, 1.0));
          // Gradients: 7x7 points over a square, mapped onto an octahedron.
          float n_ = 0.142857142857; // 1.0/7.0
          vec3  ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,7)
          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4( x.xy, y.xy );
          vec4 b1 = vec4( x.zw, y.zw );
          //vec4 s0 = floor(b0)*2.0 + 1.0;
          //vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
          vec3 p0 = vec3(a0.xy,h.x);
          vec3 p1 = vec3(a0.zw,h.y);
          vec3 p2 = vec3(a1.xy,h.z);
          vec3 p3 = vec3(a1.zw,h.w);
          // Normalise gradients
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;
          // Mix final noise value
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                        dot(p2,x2), dot(p3,x3) ) );
        }
        void main(){
          vNormal = normalMatrix * normal;
          vPosition = position;
          // Apply noise‑based displacement along the normal
          float noise = snoise(position * 2.0 + uTime * 0.5);
          vec3 displaced = position + normal * noise * 0.2;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
        }
      `
      // Fragment shader – fresnel rim + gradient based on theme colours
      const fragmentShader = `
        uniform float uTime;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main(){
          // Simple fresnel effect
          float fresnel = pow(1.0 - dot(normalize(vNormal), normalize(vPosition)), 3.0);
          // Interpolate between two theme colours based on view direction
          vec3 base = mix(uColorA, uColorB, fresnel);
          // Add slight animated pulse
          float pulse = 0.5 + 0.5 * sin(uTime * 2.0);
          gl_FragColor = vec4(base * pulse, 0.85);
        }
      `

      const createBlob = (i: number) => {
        const geometry = new IcosahedronGeometry(0.8, 1)
        const material = new ShaderMaterial({
          vertexShader,
          fragmentShader,
          uniforms: {
            uTime: { value: 0 },
            uResolution: { value: new Vector2(window.innerWidth, window.innerHeight) },
            uColorA: { value: getThemeColor('--x-accent') },
            uColorB: { value: getThemeColor('--x-base') },
          },
          transparent: true,
          side: THREE.DoubleSide,
        })
        const mesh = new Mesh(geometry, material)
        // Distribute blobs in space with random scale & rotation
        mesh.position.set(
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 2,
        )
        mesh.scale.setScalar(1 + Math.random() * 0.5)
        scene.add(mesh)
        blobs.push(mesh)
      }

      const blobCount = 7
      for (let i = 0; i < blobCount; i++) createBlob(i)

      // Resize handling
      const onResize = () => {
        const w = window.innerWidth
        const h = window.innerHeight
        renderer.setSize(w, h)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        // Update resolution uniform for all blobs
        blobs.forEach(b => (b.material.uniforms.uResolution.value.set(w, h)))
      }
      window.addEventListener('resize', onResize)
      document.addEventListener('visibilitychange', handleVisibility)

      // React to theme changes – update shader colours without recreating materials
      const observer = new MutationObserver(() => {
        const a = getThemeColor('--x-accent')
        const b = getThemeColor('--x-base')
        blobs.forEach(bm => {
          bm.material.uniforms.uColorA.value = a
          bm.material.uniforms.uColorB.value = b
        })
      })
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })

      // Start animation unless user prefers reduced motion
      if (!prefersReducedMotion.matches) startAnimation()

      // Cleanup function for the dynamic import
      return () => {
        cancelAnimation()
        window.removeEventListener('resize', onResize)
        document.removeEventListener('visibilitychange', handleVisibility)
        observer.disconnect()
        blobs.forEach(b => {
          b.geometry.dispose()
          b.material.dispose()
          scene.remove(b)
        })
        renderer.dispose()
      }
    })
    // Fallback cleanup if three fails to load
    return () => {
      if (renderer && renderer.dispose) renderer.dispose()
      cancelAnimation()
    }
  }, [mode])

  // Render nothing when background is disabled
  if (mode === 'off') return null
  return <canvas ref={canvasRef} className="fixed inset-0 -z-10 pointer-events-none" aria-hidden="true" />
}

