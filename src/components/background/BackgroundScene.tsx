import { useEffect, useRef } from 'react'
import { useBackground } from '../../stores/backgroundStore'

// Lazy-loaded three.js scene. This component sets up a WebGL renderer, creates a simple animated mesh,
// and cleans up on unmount. It respects the user's background mode and pauses when the tab is hidden
// or prefers-reduced-motion is enabled.
export default function BackgroundScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mode = useBackground((s) => s.mode)

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
      // Simple rotation animation for each blob
      blobs.forEach((b) => b.rotation.y += 0.001 * delta)
      renderer.render(scene, camera)
      animationId = requestAnimationFrame(tick)
    }

    // Dynamically import three to keep initial bundle small
    import('three').then((THREE) => {
      const { Scene, PerspectiveCamera, WebGLRenderer, IcosahedronGeometry, MeshStandardMaterial, Mesh, Color, AmbientLight, DirectionalLight } = THREE
      const canvas = canvasRef.current
      if (!canvas) return
      // Cap devicePixelRatio
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
      renderer.setPixelRatio(dpr)
      renderer.setSize(window.innerWidth, window.innerHeight)
      renderer.setClearColor(0x000000, 0) // transparent

      scene = new Scene()
      camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
      camera.position.set(0, 0, 5)

      // Lights
      const ambient = new AmbientLight(0xffffff, 0.5)
      scene.add(ambient)
      const dir = new DirectionalLight(0xffffff, 0.5)
      dir.position.set(5, 5, 5)
      scene.add(dir)

      // Create blobs (6-8)
      const blobCount = 7
      for (let i = 0; i < blobCount; i++) {
        const geom = new IcosahedronGeometry(0.8, 1)
        const mat = new MeshStandardMaterial({
          color: new Color(i % 2 === 0 ? '#00545f' : '#d6fb00'),
          roughness: 0.4,
          metalness: 0.1,
        })
        const mesh = new Mesh(geom, mat)
        mesh.position.set((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 2)
        mesh.scale.setScalar(1 + Math.random())
        scene.add(mesh)
        blobs.push(mesh)
      }

      const onResize = () => {
        const w = window.innerWidth
        const h = window.innerHeight
        renderer.setSize(w, h)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
      }
      window.addEventListener('resize', onResize)
      document.addEventListener('visibilitychange', handleVisibility)

      // Start animation unless reduced motion prefers disabled
      if (!prefersReducedMotion.matches) startAnimation()

      // Cleanup function
      return () => {
        cancelAnimation()
        window.removeEventListener('resize', onResize)
        document.removeEventListener('visibilitychange', handleVisibility)
        renderer.dispose()
        blobs.forEach((b) => b.geometry.dispose())
        blobs.forEach((b) => b.material.dispose())
      }
    })

    return () => {
      if (renderer && renderer.dispose) renderer.dispose()
      cancelAnimation()
    }
  }, [mode])

  // When mode is 'off' we render nothing
  if (mode === 'off') return null
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      aria-hidden="true"
    />
  )
}
