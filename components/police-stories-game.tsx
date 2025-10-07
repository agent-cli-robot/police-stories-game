"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Position {
  x: number
  y: number
}

interface Player {
  x: number
  y: number
  angle: number
  health: number
  maxHealth: number
  speed: number
}

interface Enemy {
  x: number
  y: number
  health: number
  angle: number
  lastShot: number
  alertLevel: number
}

interface Bullet {
  x: number
  y: number
  vx: number
  vy: number
  fromPlayer: boolean
}

interface Wall {
  x: number
  y: number
  width: number
  height: number
}

const TILE_SIZE = 32
const PLAYER_SIZE = 20
const ENEMY_SIZE = 20
const BULLET_SIZE = 4
const BULLET_SPEED = 8
const PLAYER_SPEED = 3
const ENEMY_SPEED = 1.5

export default function PoliceStoriesGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameover" | "victory">("menu")
  const [score, setScore] = useState(0)
  const [wave, setWave] = useState(1)

  const gameLoopRef = useRef<number>()
  const keysRef = useRef<Set<string>>(new Set())
  const mouseRef = useRef<Position>({ x: 0, y: 0 })
  const playerRef = useRef<Player>({
    x: 400,
    y: 300,
    angle: 0,
    health: 100,
    maxHealth: 100,
    speed: PLAYER_SPEED,
  })
  const enemiesRef = useRef<Enemy[]>([])
  const bulletsRef = useRef<Bullet[]>([])
  const wallsRef = useRef<Wall[]>([])

  // Initialize level
  const initLevel = () => {
    // Create office-like environment with walls
    wallsRef.current = [
      // Outer walls
      { x: 0, y: 0, width: 800, height: 20 },
      { x: 0, y: 0, width: 20, height: 600 },
      { x: 780, y: 0, width: 20, height: 600 },
      { x: 0, y: 580, width: 800, height: 20 },

      // Interior walls - office layout
      { x: 200, y: 100, width: 20, height: 150 },
      { x: 400, y: 150, width: 20, height: 200 },
      { x: 600, y: 100, width: 20, height: 150 },
      { x: 100, y: 350, width: 200, height: 20 },
      { x: 500, y: 400, width: 200, height: 20 },
      { x: 350, y: 250, width: 100, height: 20 },
    ]

    // Spawn enemies
    const enemyCount = 3 + wave * 2
    enemiesRef.current = []
    for (let i = 0; i < enemyCount; i++) {
      let x, y
      do {
        x = Math.random() * 700 + 50
        y = Math.random() * 500 + 50
      } while (
        Math.hypot(x - playerRef.current.x, y - playerRef.current.y) < 200 ||
        checkWallCollision({ x, y }, ENEMY_SIZE)
      )

      enemiesRef.current.push({
        x,
        y,
        health: 50,
        angle: 0,
        lastShot: 0,
        alertLevel: 0,
      })
    }

    playerRef.current = {
      x: 100,
      y: 100,
      angle: 0,
      health: 100,
      maxHealth: 100,
      speed: PLAYER_SPEED,
    }
    bulletsRef.current = []
  }

  const checkWallCollision = (pos: Position, size: number) => {
    return wallsRef.current.some(
      (wall) =>
        pos.x - size / 2 < wall.x + wall.width &&
        pos.x + size / 2 > wall.x &&
        pos.y - size / 2 < wall.y + wall.height &&
        pos.y + size / 2 > wall.y,
    )
  }

  const lineIntersectsWall = (x1: number, y1: number, x2: number, y2: number): boolean => {
    return wallsRef.current.some((wall) => {
      const left = wall.x
      const right = wall.x + wall.width
      const top = wall.y
      const bottom = wall.y + wall.height

      // Check if line intersects any of the four edges of the wall
      return (
        lineIntersectsLine(x1, y1, x2, y2, left, top, right, top) ||
        lineIntersectsLine(x1, y1, x2, y2, right, top, right, bottom) ||
        lineIntersectsLine(x1, y1, x2, y2, right, bottom, left, bottom) ||
        lineIntersectsLine(x1, y1, x2, y2, left, bottom, left, top)
      )
    })
  }

  const lineIntersectsLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number,
  ): boolean => {
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1)
    if (denom === 0) return false

    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom

    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1
  }

  const startGame = () => {
    setGameState("playing")
    setScore(0)
    setWave(1)
    initLevel()
  }

  const shootBullet = (fromPlayer: boolean, x: number, y: number, angle: number) => {
    bulletsRef.current.push({
      x,
      y,
      vx: Math.cos(angle) * BULLET_SPEED,
      vy: Math.sin(angle) * BULLET_SPEED,
      fromPlayer,
    })
  }

  useEffect(() => {
    if (gameState !== "playing") return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase())
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase())
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }

    const handleClick = () => {
      if (gameState === "playing") {
        shootBullet(true, playerRef.current.x, playerRef.current.y, playerRef.current.angle)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("click", handleClick)

    const gameLoop = () => {
      const player = playerRef.current
      const enemies = enemiesRef.current
      const bullets = bulletsRef.current
      const now = Date.now()

      // Update player position
      let newX = player.x
      let newY = player.y

      if (keysRef.current.has("w")) newY -= player.speed
      if (keysRef.current.has("s")) newY += player.speed
      if (keysRef.current.has("a")) newX -= player.speed
      if (keysRef.current.has("d")) newX += player.speed

      // Check wall collision for player
      if (!checkWallCollision({ x: newX, y: player.y }, PLAYER_SIZE)) {
        player.x = newX
      }
      if (!checkWallCollision({ x: player.x, y: newY }, PLAYER_SIZE)) {
        player.y = newY
      }

      // Keep player in bounds
      player.x = Math.max(PLAYER_SIZE, Math.min(800 - PLAYER_SIZE, player.x))
      player.y = Math.max(PLAYER_SIZE, Math.min(600 - PLAYER_SIZE, player.y))

      // Update player angle to face mouse
      const dx = mouseRef.current.x - player.x
      const dy = mouseRef.current.y - player.y
      player.angle = Math.atan2(dy, dx)

      // Update enemies
      for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i]

        // Check line of sight to player
        const hasLineOfSight = !lineIntersectsWall(enemy.x, enemy.y, player.x, player.y)

        const distToPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y)

        if (hasLineOfSight && distToPlayer < 300) {
          enemy.alertLevel = Math.min(100, enemy.alertLevel + 2)
        } else {
          enemy.alertLevel = Math.max(0, enemy.alertLevel - 1)
        }

        // Move towards player if alerted
        if (enemy.alertLevel > 50 && distToPlayer > 150) {
          const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x)
          const newEnemyX = enemy.x + Math.cos(angle) * ENEMY_SPEED
          const newEnemyY = enemy.y + Math.sin(angle) * ENEMY_SPEED

          if (!checkWallCollision({ x: newEnemyX, y: enemy.y }, ENEMY_SIZE)) {
            enemy.x = newEnemyX
          }
          if (!checkWallCollision({ x: enemy.x, y: newEnemyY }, ENEMY_SIZE)) {
            enemy.y = newEnemyY
          }
        }

        enemy.angle = Math.atan2(player.y - enemy.y, player.x - enemy.x)

        // Enemy shooting
        if (enemy.alertLevel > 70 && hasLineOfSight && now - enemy.lastShot > 1500) {
          shootBullet(false, enemy.x, enemy.y, enemy.angle)
          enemy.lastShot = now
        }
      }

      // Update bullets
      for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i]
        bullet.x += bullet.vx
        bullet.y += bullet.vy

        // Remove if out of bounds
        if (bullet.x < 0 || bullet.x > 800 || bullet.y < 0 || bullet.y > 600) {
          bullets.splice(i, 1)
          continue
        }

        // Check wall collision
        if (checkWallCollision({ x: bullet.x, y: bullet.y }, BULLET_SIZE)) {
          bullets.splice(i, 1)
          continue
        }

        // Check player hit
        if (!bullet.fromPlayer) {
          const dist = Math.hypot(bullet.x - player.x, bullet.y - player.y)
          if (dist < PLAYER_SIZE / 2) {
            player.health -= 20
            bullets.splice(i, 1)
            if (player.health <= 0) {
              setGameState("gameover")
            }
            continue
          }
        }

        // Check enemy hits
        if (bullet.fromPlayer) {
          for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j]
            const dist = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y)
            if (dist < ENEMY_SIZE / 2) {
              enemy.health -= 50
              bullets.splice(i, 1)
              if (enemy.health <= 0) {
                enemies.splice(j, 1)
                setScore((s) => s + 100)
              }
              break
            }
          }
        }
      }

      // Check victory
      if (enemies.length === 0 && gameState === "playing") {
        setWave((w) => w + 1)
        setTimeout(() => {
          initLevel()
        }, 1000)
      }

      // Render
      ctx.fillStyle = "#1a1a1a"
      ctx.fillRect(0, 0, 800, 600)

      // Draw floor tiles
      ctx.strokeStyle = "#2a2a2a"
      ctx.lineWidth = 1
      for (let x = 0; x < 800; x += TILE_SIZE) {
        for (let y = 0; y < 600; y += TILE_SIZE) {
          ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE)
        }
      }

      // Draw walls
      ctx.fillStyle = "#3a3a3a"
      ctx.strokeStyle = "#4a4a4a"
      ctx.lineWidth = 2
      wallsRef.current.forEach((wall) => {
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height)
        ctx.strokeRect(wall.x, wall.y, wall.width, wall.height)
      })

      // Draw bullets
      bullets.forEach((bullet) => {
        ctx.fillStyle = bullet.fromPlayer ? "#fbbf24" : "#ef4444"
        ctx.beginPath()
        ctx.arc(bullet.x, bullet.y, BULLET_SIZE, 0, Math.PI * 2)
        ctx.fill()
      })

      // Draw enemies
      enemies.forEach((enemy) => {
        // Body
        ctx.fillStyle = enemy.alertLevel > 50 ? "#dc2626" : "#7f1d1d"
        ctx.beginPath()
        ctx.arc(enemy.x, enemy.y, ENEMY_SIZE / 2, 0, Math.PI * 2)
        ctx.fill()

        // Direction indicator
        ctx.strokeStyle = "#ef4444"
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(enemy.x, enemy.y)
        ctx.lineTo(enemy.x + Math.cos(enemy.angle) * ENEMY_SIZE, enemy.y + Math.sin(enemy.angle) * ENEMY_SIZE)
        ctx.stroke()

        // Alert indicator
        if (enemy.alertLevel > 0) {
          ctx.fillStyle = `rgba(239, 68, 68, ${enemy.alertLevel / 100})`
          ctx.beginPath()
          ctx.arc(enemy.x, enemy.y, ENEMY_SIZE, 0, Math.PI * 2)
          ctx.fill()
        }
      })

      // Draw player
      ctx.fillStyle = "#3b82f6"
      ctx.beginPath()
      ctx.arc(player.x, player.y, PLAYER_SIZE / 2, 0, Math.PI * 2)
      ctx.fill()

      // Player direction
      ctx.strokeStyle = "#60a5fa"
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(player.x, player.y)
      ctx.lineTo(player.x + Math.cos(player.angle) * PLAYER_SIZE, player.y + Math.sin(player.angle) * PLAYER_SIZE)
      ctx.stroke()

      gameLoopRef.current = requestAnimationFrame(gameLoop)
    }

    gameLoop()

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("click", handleClick)
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [gameState])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4">
      <div className="text-center space-y-2">
        <h1 className="font-mono text-4xl font-bold tracking-tighter text-foreground">POLICE STORIES</h1>
        <p className="text-muted-foreground font-mono text-sm">TACTICAL TOP-DOWN SHOOTER</p>
      </div>

      {gameState === "menu" && (
        <Card className="p-8 space-y-6 max-w-md bg-card border-border">
          <div className="space-y-4 text-center">
            <h2 className="text-2xl font-bold text-card-foreground">Mission Briefing</h2>
            <div className="space-y-2 text-sm text-muted-foreground font-mono">
              <p>• WASD to move</p>
              <p>• Mouse to aim</p>
              <p>• Click to shoot</p>
              <p>• Eliminate all hostiles</p>
              <p>• Use cover wisely</p>
            </div>
          </div>
          <Button
            onClick={startGame}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-mono"
            size="lg"
          >
            START MISSION
          </Button>
        </Card>
      )}

      {gameState === "playing" && (
        <div className="space-y-4">
          <div className="flex gap-4 justify-between font-mono text-sm">
            <Card className="px-4 py-2 bg-card border-border">
              <span className="text-muted-foreground">HEALTH: </span>
              <span className="text-destructive font-bold">{Math.max(0, playerRef.current.health)}%</span>
            </Card>
            <Card className="px-4 py-2 bg-card border-border">
              <span className="text-muted-foreground">WAVE: </span>
              <span className="text-accent font-bold">{wave}</span>
            </Card>
            <Card className="px-4 py-2 bg-card border-border">
              <span className="text-muted-foreground">SCORE: </span>
              <span className="text-primary font-bold">{score}</span>
            </Card>
            <Card className="px-4 py-2 bg-card border-border">
              <span className="text-muted-foreground">HOSTILES: </span>
              <span className="text-destructive font-bold">{enemiesRef.current.length}</span>
            </Card>
          </div>

          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="border-2 border-border rounded-sm shadow-2xl cursor-crosshair bg-background"
          />
        </div>
      )}

      {gameState === "gameover" && (
        <Card className="p-8 space-y-6 max-w-md bg-card border-destructive">
          <div className="space-y-4 text-center">
            <h2 className="text-3xl font-bold text-destructive font-mono">MISSION FAILED</h2>
            <div className="space-y-2">
              <p className="text-muted-foreground font-mono">Final Score: {score}</p>
              <p className="text-muted-foreground font-mono">Wave Reached: {wave}</p>
            </div>
          </div>
          <Button
            onClick={startGame}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-mono"
            size="lg"
          >
            RETRY MISSION
          </Button>
        </Card>
      )}
    </div>
  )
}
