"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAudioManager } from "@/hooks/useAudioManager"
import { useGameSettings } from "@/contexts/GameSettingsContext"
import Settings from "@/components/settings"
import { BloodParticles, createBloodParticles, updateBloodParticles } from "@/components/BloodParticles"

// Define enemy states
enum EnemyState {
  PATROL = 'patrol',
  DEFEND = 'defend',
  ATTACK = 'attack',
  SUSPICIOUS = 'suspicious',
}

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
  state: EnemyState
  stateTimer: number
  patrolPoint: Position | null
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

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
  color: string;
}

const TILE_SIZE = 32
const PLAYER_SIZE = 20
const ENEMY_SIZE = 20
const BULLET_SIZE = 4
const BULLET_SPEED = 8
const PLAYER_SPEED = 3
const ENEMY_SPEED = 1.5

// Game world dimensions (larger than visible canvas)
const WORLD_WIDTH = 2000
const WORLD_HEIGHT = 2000

export default function PoliceStoriesGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameover" | "victory" | "settings">("menu")
  const [score, setScore] = useState(0)
  const [wave, setWave] = useState(1)
  
  const { playMusic, stopMusic, playSound } = useAudioManager()
  const { settings } = useGameSettings()
  
  // State for blood particles
  const [bloodParticles, setBloodParticles] = useState<Particle[]>([]);
  const bloodParticlesRef = useRef<Particle[]>([]);
  const frameCountRef = useRef<number>(0);

  const gameLoopRef = useRef<number>()
  const keysRef = useRef<Set<string>>(new Set())

  // Handle game state changes for audio
  useEffect(() => {
    if (gameState === "gameover") {
      stopMusic(); // Stop music when game ends
    }
  }, [gameState, stopMusic])
  // Camera state - follows player
  const cameraRef = useRef<Position>({ x: 0, y: 0 })
  
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
    // Create office-like environment with walls in a larger world
    wallsRef.current = [
      // Outer walls for the large world
      { x: 0, y: 0, width: WORLD_WIDTH, height: 20 },
      { x: 0, y: 0, width: 20, height: WORLD_HEIGHT },
      { x: WORLD_WIDTH - 20, y: 0, width: 20, height: WORLD_HEIGHT },
      { x: 0, y: WORLD_HEIGHT - 20, width: WORLD_WIDTH, height: 20 },

      // Interior walls - office layout in the larger world
      { x: 200, y: 100, width: 20, height: 150 },
      { x: 400, y: 150, width: 20, height: 200 },
      { x: 600, y: 100, width: 20, height: 150 },
      { x: 100, y: 350, width: 200, height: 20 },
      { x: 500, y: 400, width: 200, height: 20 },
      { x: 350, y: 250, width: 100, height: 20 },
      
      // Additional walls to make the larger world more interesting
      { x: 800, y: 200, width: 20, height: 300 },
      { x: 1000, y: 500, width: 300, height: 20 },
      { x: 1200, y: 700, width: 20, height: 200 },
      { x: 1400, y: 300, width: 200, height: 20 },
      { x: 1600, y: 100, width: 20, height: 400 },
    ]

    // Spawn enemies in the larger world
    const enemyCount = 3 + wave * 2
    enemiesRef.current = []
    for (let i = 0; i < enemyCount; i++) {
      let x, y
      do {
        x = Math.random() * (WORLD_WIDTH - 100) + 50
        y = Math.random() * (WORLD_HEIGHT - 100) + 50
      } while (
        Math.hypot(x - playerRef.current.x, y - playerRef.current.y) < 200 ||
        checkWallCollision({ x, y }, ENEMY_SIZE)
      )

      // Random patrol point for enemies in the larger world
      const patrolX = Math.random() * (WORLD_WIDTH - 100) + 50
      const patrolY = Math.random() * (WORLD_HEIGHT - 100) + 50

      enemiesRef.current.push({
        x,
        y,
        health: 50,
        angle: 0,
        lastShot: 0,
        alertLevel: 0,
        state: EnemyState.PATROL,
        stateTimer: 0,
        patrolPoint: { x: patrolX, y: patrolY }
      })
    }

    // Start player at center of world initially, but can be changed
    playerRef.current = {
      x: WORLD_WIDTH / 2,
      y: WORLD_HEIGHT / 2,
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
    playMusic() // Start background music when game starts
  }

  const shootBullet = (fromPlayer: boolean, x: number, y: number, angle: number) => {
    bulletsRef.current.push({
      x,
      y,
      vx: Math.cos(angle) * BULLET_SPEED,
      vy: Math.sin(angle) * BULLET_SPEED,
      fromPlayer,
    })
    
    // Play shooting sound based on type
    if (fromPlayer) {
      playSound('pistol_shot'); // Player shooting
    } else {
      playSound('pistol_shot'); // Enemy shooting
    }
  }

  useEffect(() => {
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

      // Keep player in world bounds
      player.x = Math.max(PLAYER_SIZE, Math.min(WORLD_WIDTH - PLAYER_SIZE, player.x))
      player.y = Math.max(PLAYER_SIZE, Math.min(WORLD_HEIGHT - PLAYER_SIZE, player.y))

      // Update player angle to face mouse (convert mouse position to world coordinates for accurate aiming)
      const worldMouseX = mouseRef.current.x + cameraRef.current.x
      const worldMouseY = mouseRef.current.y + cameraRef.current.y
      const dx = worldMouseX - player.x
      const dy = worldMouseY - player.y
      player.angle = Math.atan2(dy, dx)

      // Update enemies
      for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i]

        // Update state timer
        enemy.stateTimer += 1/60 // Assuming ~60fps

        // Check line of sight to player
        const hasLineOfSight = !lineIntersectsWall(enemy.x, enemy.y, player.x, player.y)
        const distToPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y)

        // Update alert level based on different states
        let newAlertLevel = enemy.alertLevel
        if (hasLineOfSight && distToPlayer < 300) {
          if (distToPlayer < 100) {
            newAlertLevel = Math.min(100, enemy.alertLevel + 5) // Aggressive increase when very close
          } else if (distToPlayer < 200) {
            newAlertLevel = Math.min(100, enemy.alertLevel + 3) // Moderate increase when close
          } else {
            newAlertLevel = Math.min(100, enemy.alertLevel + 1) // Slow increase when far
          }
        } else if (distToPlayer > 350) {
          newAlertLevel = Math.max(0, enemy.alertLevel - 1) // Slow decrease when far away
        }
        enemy.alertLevel = newAlertLevel

        // Determine new state based on conditions
        let newState = enemy.state
        switch (enemy.state) {
          case EnemyState.PATROL:
            // If patrolling and see player or hear noise, go suspicious
            if (enemy.alertLevel > 30) {
              newState = EnemyState.SUSPICIOUS
            } else {
              // Continue patrolling
              newState = EnemyState.PATROL
            }
            break
          case EnemyState.SUSPICIOUS:
            // If suspicious and see player clearly, go to attack/defend
            if (enemy.alertLevel > 60) {
              newState = distToPlayer < 200 ? EnemyState.ATTACK : EnemyState.DEFEND
            } else if (enemy.alertLevel < 20) {
              // If suspicion fades, return to patrol
              newState = EnemyState.PATROL
            } else {
              // Stay suspicious
              newState = EnemyState.SUSPICIOUS
            }
            break
          case EnemyState.DEFEND:
            // If very alert, go to attack
            if (enemy.alertLevel > 80) {
              newState = EnemyState.ATTACK
            } else if (enemy.alertLevel < 40) {
              // If alert level drops, go back to patrol
              newState = EnemyState.PATROL
            } else {
              // Stay in defend if still alert but not aggressive
              newState = EnemyState.DEFEND
            }
            break
          case EnemyState.ATTACK:
            // If player is far and alert level drops, go to defend
            if (enemy.alertLevel < 50 && distToPlayer > 250) {
              newState = EnemyState.DEFEND
            } else if (enemy.alertLevel < 30 && distToPlayer > 300) {
              // If player is far and not alert, go back to patrol
              newState = EnemyState.PATROL
            } else {
              // Stay in attack if player is close and still alert
              newState = EnemyState.ATTACK
            }
            break
        }

        // Apply state transition with cooldown to prevent flickering
        if (newState !== enemy.state && enemy.stateTimer > 0.5) {
          enemy.state = newState
          enemy.stateTimer = 0
        }

        // Execute behavior based on current state
        switch (enemy.state) {
          case EnemyState.PATROL:
            // Move towards patrol point
            if (enemy.patrolPoint) {
              const distToPatrol = Math.hypot(enemy.patrolPoint.x - enemy.x, enemy.patrolPoint.y - enemy.y)
              if (distToPatrol > 20) {
                const angle = Math.atan2(enemy.patrolPoint.y - enemy.y, enemy.patrolPoint.x - enemy.x)
                const newEnemyX = enemy.x + Math.cos(angle) * ENEMY_SPEED * 0.5 // Slower patrol speed
                const newEnemyY = enemy.y + Math.sin(angle) * ENEMY_SPEED * 0.5

                if (!checkWallCollision({ x: newEnemyX, y: enemy.y }, ENEMY_SIZE)) {
                  enemy.x = newEnemyX
                }
                if (!checkWallCollision({ x: enemy.x, y: newEnemyY }, ENEMY_SIZE)) {
                  enemy.y = newEnemyY
                }
              }
            }
            break
          case EnemyState.SUSPICIOUS:
            // Look around (slowly rotate)
            enemy.angle += 0.02
            // Slow movement towards where they think player is
            if (hasLineOfSight) {
              const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x)
              const newEnemyX = enemy.x + Math.cos(angle) * ENEMY_SPEED * 0.3
              const newEnemyY = enemy.y + Math.sin(angle) * ENEMY_SPEED * 0.3

              if (!checkWallCollision({ x: newEnemyX, y: enemy.y }, ENEMY_SIZE)) {
                enemy.x = newEnemyX
              }
              if (!checkWallCollision({ x: enemy.x, y: newEnemyY }, ENEMY_SIZE)) {
                enemy.y = newEnemyY
              }
              enemy.angle = angle
            }
            break
          case EnemyState.DEFEND:
            // Hold position and watch for player
            if (hasLineOfSight) {
              enemy.angle = Math.atan2(player.y - enemy.y, player.x - enemy.x)
            }
            break
          case EnemyState.ATTACK:
            // Move aggressively towards player
            if (distToPlayer > 100) { // Don't get too close
              const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x)
              const newEnemyX = enemy.x + Math.cos(angle) * ENEMY_SPEED
              const newEnemyY = enemy.y + Math.sin(angle) * ENEMY_SPEED

              if (!checkWallCollision({ x: newEnemyX, y: enemy.y }, ENEMY_SIZE)) {
                enemy.x = newEnemyX
              }
              if (!checkWallCollision({ x: enemy.x, y: newEnemyY }, ENEMY_SIZE)) {
                enemy.y = newEnemyY
              }
              enemy.angle = angle
            }
            break
        }

        // Enemy shooting - only in attack and defend states
        if (enemy.state === EnemyState.ATTACK || enemy.state === EnemyState.DEFEND) {
          if (hasLineOfSight && now - enemy.lastShot > 1500 && distToPlayer < 300) {
            shootBullet(false, enemy.x, enemy.y, enemy.angle)
            enemy.lastShot = now
          }
        }
      }

      // Update bullets
      for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i]
        bullet.x += bullet.vx
        bullet.y += bullet.vy

        // Remove if out of bounds of the world
        if (bullet.x < 0 || bullet.x > WORLD_WIDTH || bullet.y < 0 || bullet.y > WORLD_HEIGHT) {
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
            playSound('player_hit_1'); // Play hit sound
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
              
              // Create blood particles if enabled in settings
              if (settings.bloodEffects) {
                const newParticles = createBloodParticles(enemy.x, enemy.y, 6);
                bloodParticlesRef.current = [...bloodParticlesRef.current, ...newParticles];
              }
              
              bullets.splice(i, 1)
              if (enemy.health <= 0) {
                enemies.splice(j, 1)
                setScore((s) => s + 100)
                playSound('power_up_1'); // Play enemy defeated sound
              }
              break
            }
          }
        }
      }

      // Update camera to follow player with smooth movement
      const targetCameraX = player.x - 400 // 400 is half the canvas width
      const targetCameraY = player.y - 300 // 300 is half the canvas height
      
      // Smooth camera following with lerp (linear interpolation)
      cameraRef.current.x = cameraRef.current.x + (targetCameraX - cameraRef.current.x) * 0.1
      cameraRef.current.y = cameraRef.current.y + (targetCameraY - cameraRef.current.y) * 0.1
      
      // Keep camera within world bounds
      cameraRef.current.x = Math.max(0, Math.min(WORLD_WIDTH - 800, cameraRef.current.x))
      cameraRef.current.y = Math.max(0, Math.min(WORLD_HEIGHT - 600, cameraRef.current.y))

      // Update blood particles
      bloodParticlesRef.current = updateBloodParticles(bloodParticlesRef.current);
      
      // Sync ref to state every few frames to avoid excessive re-renders
      frameCountRef.current++;
      if (frameCountRef.current % 5 === 0) { // Update state every 5 frames
        setBloodParticles([...bloodParticlesRef.current]);
      }

      // Render
      ctx.fillStyle = "#1a1a1a"
      ctx.fillRect(0, 0, 800, 600)

      // Draw floor tiles
      ctx.strokeStyle = "#2a2a2a"
      ctx.lineWidth = 1
      
      // Calculate visible tile range based on camera position
      const startX = Math.floor(cameraRef.current.x / TILE_SIZE) * TILE_SIZE
      const startY = Math.floor(cameraRef.current.y / TILE_SIZE) * TILE_SIZE
      const endX = Math.ceil((cameraRef.current.x + 800) / TILE_SIZE) * TILE_SIZE
      const endY = Math.ceil((cameraRef.current.y + 600) / TILE_SIZE) * TILE_SIZE
      
      for (let x = startX; x < endX; x += TILE_SIZE) {
        for (let y = startY; y < endY; y += TILE_SIZE) {
          // Only draw tiles within the visible area
          ctx.strokeRect(x - cameraRef.current.x, y - cameraRef.current.y, TILE_SIZE, TILE_SIZE)
        }
      }

      // Draw walls with camera offset
      ctx.fillStyle = "#3a3a3a"
      ctx.strokeStyle = "#4a4a4a"
      ctx.lineWidth = 2
      wallsRef.current.forEach((wall) => {
        // Only draw walls that are visible in the camera view
        if (wall.x + wall.width > cameraRef.current.x && 
            wall.x < cameraRef.current.x + 800 &&
            wall.y + wall.height > cameraRef.current.y && 
            wall.y < cameraRef.current.y + 600) {
          ctx.fillRect(wall.x - cameraRef.current.x, wall.y - cameraRef.current.y, wall.width, wall.height)
          ctx.strokeRect(wall.x - cameraRef.current.x, wall.y - cameraRef.current.y, wall.width, wall.height)
        }
      })

      // Draw bullets with camera offset
      bullets.forEach((bullet) => {
        // Only draw bullets that are visible in the camera view
        if (bullet.x > cameraRef.current.x && 
            bullet.x < cameraRef.current.x + 800 &&
            bullet.y > cameraRef.current.y && 
            bullet.y < cameraRef.current.y + 600) {
          ctx.fillStyle = bullet.fromPlayer ? "#fbbf24" : "#ef4444"
          ctx.beginPath()
          ctx.arc(bullet.x - cameraRef.current.x, bullet.y - cameraRef.current.y, BULLET_SIZE, 0, Math.PI * 2)
          ctx.fill()
        }
      })

      // Draw enemies with color based on state and camera offset
      enemies.forEach((enemy) => {
        // Only draw enemies that are visible in the camera view
        if (enemy.x > cameraRef.current.x - ENEMY_SIZE && 
            enemy.x < cameraRef.current.x + 800 + ENEMY_SIZE &&
            enemy.y > cameraRef.current.y - ENEMY_SIZE && 
            enemy.y < cameraRef.current.y + 600 + ENEMY_SIZE) {
          
          // Set color based on state
          let enemyColor: string
          let alertColor: string
          switch (enemy.state) {
            case EnemyState.PATROL:
              enemyColor = "#7f1d1d"  // Dark red for patrol
              alertColor = "rgba(127, 29, 29, 0.3)"  // Darker alert indicator
              break
            case EnemyState.SUSPICIOUS:
              enemyColor = "#f59e0b"  // Yellow for suspicious
              alertColor = "rgba(245, 158, 11, 0.5)"
              break
            case EnemyState.DEFEND:
              enemyColor = "#8b5cf6"  // Purple for defend
              alertColor = "rgba(139, 92, 246, 0.6)"
              break
            case EnemyState.ATTACK:
              enemyColor = "#dc2626"  // Bright red for attack
              alertColor = "rgba(220, 38, 38, 0.8)"
              break
            default:
              enemyColor = "#7f1d1d"
              alertColor = "rgba(239, 68, 68, 0.3)"
          }

          // Body
          ctx.fillStyle = enemyColor
          ctx.beginPath()
          ctx.arc(enemy.x - cameraRef.current.x, enemy.y - cameraRef.current.y, ENEMY_SIZE / 2, 0, Math.PI * 2)
          ctx.fill()

          // Direction indicator
          ctx.strokeStyle = "#ffffff"
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(enemy.x - cameraRef.current.x, enemy.y - cameraRef.current.y)
          ctx.lineTo(
            enemy.x - cameraRef.current.x + Math.cos(enemy.angle) * ENEMY_SIZE, 
            enemy.y - cameraRef.current.y + Math.sin(enemy.angle) * ENEMY_SIZE
          )
          ctx.stroke()

          // Alert indicator
          if (enemy.alertLevel > 0) {
            ctx.fillStyle = `rgba(239, 68, 68, ${enemy.alertLevel / 100 * 0.7})`
            ctx.beginPath()
            ctx.arc(enemy.x - cameraRef.current.x, enemy.y - cameraRef.current.y, ENEMY_SIZE, 0, Math.PI * 2)
            ctx.fill()
          }
          
          // State indicator (small circle above enemy)
          ctx.fillStyle = enemyColor
          ctx.beginPath()
          ctx.arc(
            enemy.x - cameraRef.current.x, 
            enemy.y - cameraRef.current.y - ENEMY_SIZE, 
            4, 0, Math.PI * 2
          )
          ctx.fill()
        }
      })

      // Draw player with camera offset
      ctx.fillStyle = "#3b82f6"
      ctx.beginPath()
      ctx.arc(player.x - cameraRef.current.x, player.y - cameraRef.current.y, PLAYER_SIZE / 2, 0, Math.PI * 2)
      ctx.fill()

      // Player direction
      ctx.strokeStyle = "#60a5fa"
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(player.x - cameraRef.current.x, player.y - cameraRef.current.y)
      ctx.lineTo(
        player.x - cameraRef.current.x + Math.cos(player.angle) * PLAYER_SIZE, 
        player.y - cameraRef.current.y + Math.sin(player.angle) * PLAYER_SIZE
      )
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
      // Stop all audio when unmounting
      stopMusic();
    }
  }, [gameState, playMusic, stopMusic])

  const handleBackToMenu = () => {
    setGameState("menu");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4">
      {gameState === "menu" && (
        <div className="text-center space-y-2">
          <h1 className="font-mono text-4xl font-bold tracking-tighter text-foreground">POLICE STORIES</h1>
          <p className="text-muted-foreground font-mono text-sm">TACTICAL TOP-DOWN SHOOTER</p>
        </div>
      )}

      {gameState === "menu" && (
        <Card className="p-8 space-y-6 max-w-md bg-card border-border">
          <div className="space-y-4 text-center">
            <h2 className="text-2xl font-bold text-card-foreground">Mission Briefing</h2>
            <div className="space-y-2 text-sm text-muted-foreground font-mono">
              <p>• Eliminate all hostiles</p>
              <p>• Use cover wisely</p>
            </div>
          </div>
          <div className="space-y-3">
            <Button
              onClick={startGame}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-mono"
              size="lg"
            >
              START MISSION
            </Button>
            <Button
              onClick={() => setGameState("settings")}
              variant="outline"
              className="w-full font-mono border-border"
              size="lg"
            >
              SETTINGS
            </Button>
          </div>
        </Card>
      )}

      {gameState === "playing" && (
        <div className="relative space-y-4">
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
          
          {/* Blood particles overlay */}
          <BloodParticles 
            particles={bloodParticlesRef.current} 
            cameraX={cameraRef.current.x} 
            cameraY={cameraRef.current.y} 
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

      {gameState === "settings" && (
        <Settings onBack={handleBackToMenu} />
      )}
    </div>
  )
}