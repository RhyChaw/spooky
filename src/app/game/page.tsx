"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, OrbitControls, useGLTF, PointerLockControls, KeyboardControls, useKeyboardControls, Html } from "@react-three/drei";
import * as THREE from "three";

function RoomModel(props: JSX.IntrinsicElements["group"]) {
  const { scene } = useGLTF("/the_room.glb");
  const room = useMemo(() => scene.clone(), [scene]);
  // Ensure room can receive and cast light
  useEffect(() => {
    room.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if ((mesh as any).isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [room]);
  return (
    <group {...props}>
      <primitive object={room} />
    </group>
  );
}

function Lights({ brightness = 1 }: { brightness?: number }) {
  return (
    <>
      <ambientLight intensity={0.12 * brightness} />
      <pointLight
        position={[0, 2.5, 0]}
        intensity={2.8 * brightness}
        distance={10 * brightness}
        decay={2}
        color="#ffdd88"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[3, 1.2, 3]} intensity={0.4 * brightness} distance={6 * brightness} decay={2} color="#886644" />
    </>
  );
}

function FirstPersonController({ movementDisabled, onFlashlightToggle }: { movementDisabled: boolean; onFlashlightToggle: () => void }) {
  const { camera } = useThree();
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const [, getKeys] = useKeyboardControls();
  const lastFlashlightPress = useRef(false);

  useEffect(() => {
    camera.position.set(0, 1.6, 5);
  }, [camera]);

  useFrame((_, delta) => {
    // Don't move if movement is disabled
    if (movementDisabled) return;
    
    const move = getKeys();
    const speed = 5;

    // Handle flashlight toggle
    if (move.flashlight && !lastFlashlightPress.current) {
      console.log("F key detected, calling flashlight toggle");
      onFlashlightToggle();
      lastFlashlightPress.current = true;
    } else if (!move.flashlight) {
      lastFlashlightPress.current = false;
    }

    direction.current.set(0, 0, 0);
    // Ensure W moves forward in view direction, A strafes left
    if (move.forward) direction.current.z += 1;
    if (move.backward) direction.current.z -= 1;
    if (move.left) direction.current.x -= 1;  // A moves left (-X)
    if (move.right) direction.current.x += 1; // D moves right (+X)
    direction.current.normalize();

    // Move in camera space parallel to ground
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));

    velocity.current.copy(forward).multiplyScalar(direction.current.z * speed);
    velocity.current.add(right.multiplyScalar(direction.current.x * speed));

    camera.position.addScaledVector(velocity.current, delta);

    // Keep camera at eye level
    camera.position.y = 1.6;
  });

  return null;
}

function CoordinateDisplay({ coords }: { coords: { x: number; y: number; z: number } }) {
  return (
    <div className="fixed top-4 left-4 z-30 bg-black/80 text-white p-3 rounded font-mono text-sm">
      <div>Position: ({coords.x}, {coords.y}, {coords.z})</div>
      <div className="text-xs text-gray-400 mt-1">WASD to move • Mouse to look</div>
    </div>
  );
}

function CanvasCoordReporter({ onChange }: { onChange: (c: { x: number; y: number; z: number }) => void }) {
  const { camera } = useThree();
  useFrame(() => {
    onChange({
      x: Math.round(camera.position.x * 100) / 100,
      y: Math.round(camera.position.y * 100) / 100,
      z: Math.round(camera.position.z * 100) / 100,
    });
  });
  return null;
}

function ChairProximityDetector({ onProximityChange }: { onProximityChange: (isNear: boolean) => void }) {
  const { camera } = useThree();
  const chairPosition = new THREE.Vector3(0, 0, 0); // Chair is at origin
  const proximityThreshold = 2.5; // Distance threshold for showing instruction

  useFrame(() => {
    const distance = camera.position.distanceTo(chairPosition);
    const isNear = distance <= proximityThreshold;
    onProximityChange(isNear);
  });

  return null;
}

function GhostModel({ glow, ...props }: JSX.IntrinsicElements["group"] & { glow?: boolean }) {
  const { scene } = useGLTF("/ghost.glb");
  const ghost = useMemo(() => scene.clone(), [scene]);
  
  // Ensure ghost can receive and cast light
  useEffect(() => {
    ghost.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if ((mesh as any).isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [ghost]);

  return (
    <group {...props}>
      <primitive object={ghost} />
      {glow && (
        <pointLight
          position={[0, 1, 0]}
          intensity={3}
          distance={8}
          decay={2}
          color="#ff0000"
        />
      )}
    </group>
  );
}

function Flashlight({ enabled }: { enabled: boolean }) {
  const { camera } = useThree();
  const spotLightRef = useRef<THREE.SpotLight>(null);
  
  useFrame(() => {
    if (spotLightRef.current && enabled) {
      // Position the flashlight at camera position
      spotLightRef.current.position.copy(camera.position);
      
      // Make it point in the direction the camera is looking
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      spotLightRef.current.target.position.copy(camera.position).add(direction.multiplyScalar(10));
      spotLightRef.current.target.updateMatrixWorld();
    }
  });
  
  if (!enabled) return null;
  
  return (
    <spotLight
      ref={spotLightRef}
      angle={Math.PI / 6} // 30 degree cone
      penumbra={0.2}
      intensity={24}
      distance={50}
      decay={2}
      color="#ffffff"
      castShadow
      shadow-mapSize-width={1024}
      shadow-mapSize-height={1024}
    />
  );
}

function NoticeBoardModel(props: JSX.IntrinsicElements["group"]) {
  const { scene } = useGLTF("/notice_board_low-poly.glb");
  const noticeBoard = useMemo(() => scene.clone(), [scene]);
  
  // Ensure notice board can receive and cast light
  useEffect(() => {
    noticeBoard.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if ((mesh as any).isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [noticeBoard]);

  return (
    <group {...props}>
      <primitive object={noticeBoard} />
    </group>
  );
}

function KnightModel(props: JSX.IntrinsicElements["group"]) {
  const { scene } = useGLTF("/knight_of_the_blood_order.glb");
  const knight = useMemo(() => scene.clone(), [scene]);
  
  // Ensure knight can receive and cast light
  useEffect(() => {
    knight.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if ((mesh as any).isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [knight]);

  return (
    <group {...props}>
      <primitive object={knight} />
    </group>
  );
}

function PeacockModel(props: JSX.IntrinsicElements["group"]) {
  const { scene } = useGLTF("/peacock_portrait_smoothie-3d_upload.glb");
  const peacock = useMemo(() => scene.clone(), [scene]);
  
  // Ensure peacock can receive and cast light
  useEffect(() => {
    peacock.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if ((mesh as any).isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [peacock]);

  return (
    <group {...props}>
      <primitive object={peacock} />
    </group>
  );
}

function DollModel(props: JSX.IntrinsicElements["group"]) {
  const { scene } = useGLTF("/doll.glb");
  const doll = useMemo(() => scene.clone(), [scene]);
  
  // Ensure doll can receive and cast light
  useEffect(() => {
    doll.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if ((mesh as any).isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [doll]);

  return (
    <group {...props}>
      <primitive object={doll} />
    </group>
  );
}

function NoticeBoardProximityDetector({ onProximityChange }: { onProximityChange: (isNear: boolean) => void }) {
  const { camera } = useThree();
  const noticeBoardPosition = new THREE.Vector3(-0.65, 1.6, -8.82);
  const proximityThreshold = 3; // Distance threshold for showing riddle

  useFrame(() => {
    const distance = camera.position.distanceTo(noticeBoardPosition);
    const isNear = distance <= proximityThreshold;
    onProximityChange(isNear);
  });

  return null;
}

function PeacockHoverDetector({ 
  onHoverChange, 
  onCameraFlip, 
  onPeacockSwap 
}: { 
  onHoverChange: (isHovering: boolean) => void;
  onCameraFlip: () => void;
  onPeacockSwap: () => void;
}) {
  const { camera } = useThree();
  const peacockPosition = new THREE.Vector3(-9.07, 1.6, 8.73);
  const dollPosition = new THREE.Vector3(-9.07, 1, 8.09);
  const hoverThreshold = 2; // Distance threshold for hover detection

  useFrame(() => {
    const distance = camera.position.distanceTo(peacockPosition);
    const isHovering = distance <= hoverThreshold;
    
    if (isHovering) {
      onHoverChange(true);
      
      // Check if user is looking at the peacock (camera direction)
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      const toPeacock = peacockPosition.clone().sub(camera.position).normalize();
      const dot = direction.dot(toPeacock);
      
      // If looking at peacock (dot product close to 1)
      if (dot > 0.7) {
        onCameraFlip();
        onPeacockSwap();
      }
    } else {
      onHoverChange(false);
    }
  });
  return null;
}

function PlayerBoundary({ onPositionChange }: { onPositionChange: (pos: THREE.Vector3) => void }) {
  const { camera } = useThree();
  
  // Define the square boundary corners
  const corner1 = new THREE.Vector3(9.21, 1.6, 8.73);
  const corner2 = new THREE.Vector3(-9.07, 1.6, -8.95);
  
  // Calculate min and max bounds
  const minX = Math.min(corner1.x, corner2.x);
  const maxX = Math.max(corner1.x, corner2.x);
  const minZ = Math.min(corner1.z, corner2.z);
  const maxZ = Math.max(corner1.z, corner2.z);
  
  useFrame(() => {
    const currentPos = camera.position.clone();
    let positionChanged = false;
    
    // Clamp X position
    if (currentPos.x < minX) {
      currentPos.x = minX;
      positionChanged = true;
    } else if (currentPos.x > maxX) {
      currentPos.x = maxX;
      positionChanged = true;
    }
    
    // Clamp Z position
    if (currentPos.z < minZ) {
      currentPos.z = minZ;
      positionChanged = true;
    } else if (currentPos.z > maxZ) {
      currentPos.z = maxZ;
      positionChanged = true;
    }
    
    // Apply the constrained position
    if (positionChanged) {
      camera.position.copy(currentPos);
      onPositionChange(currentPos);
    }
  });

  return null;
}

function RiddleText({ visible }: { visible: boolean }) {
  if (!visible) return null;
  
  return (
    <group position={[-0.81, 2, -8.28]} rotation={[0, 0, 0]}>
      {/* Background plane */}
      <mesh position={[0, 0, 0.1]}>
        <planeGeometry args={[4, 2]} />
        <meshBasicMaterial 
          color="#000000" 
          transparent 
          opacity={0.8}
        />
      </mesh>
      
      {/* Text content using HTML overlay positioned in 3D space */}
      <Html
        position={[0, 0, 0.11]}
        center
        transform
        occlude
        distanceFactor={2}
      >
        <div className="text-yellow-400 text-lg font-bold tracking-wider leading-tight text-center max-w-sm">
          "In shadowed halls where whispers spread,<br/>
          Find the peacock, strike its head.<br/>
          Bleeding silence marks your way,<br/>
          The path awakens when it's slain."
        </div>
      </Html>
    </group>
  );
}

export default function GamePage() {
  const params = useSearchParams();
  const name = params.get("name") || "Player";
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0, z: 0 });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"resume" | "controls" | "audio" | "brightness">("resume");
  const [brightness, setBrightness] = useState(1);
  const [showChairInstruction, setShowChairInstruction] = useState(false);
  const [ghostVisible, setGhostVisible] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [ghostPosition, setGhostPosition] = useState([-5.37, 0, 1.24] as [number, number, number]);
  const [ghostRotation, setGhostRotation] = useState([0, Math.PI / 2, 0] as [number, number, number]);
  const [ghostGlow, setGhostGlow] = useState(false);
  const [userPosition, setUserPosition] = useState([0, 1.6, 5] as [number, number, number]);
  const [showControls, setShowControls] = useState(true);
  const [health, setHealth] = useState(100);
  const [movementDisabled, setMovementDisabled] = useState(false);
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [showStartNotice, setShowStartNotice] = useState(true);
  const [showNoticeRiddle, setShowNoticeRiddle] = useState(false);
  const [showFlashlightNotice, setShowFlashlightNotice] = useState(false);
  const [showPeacockHover, setShowPeacockHover] = useState(false);
  const [cameraFlipped, setCameraFlipped] = useState(false);
  const [peacockSwapped, setPeacockSwapped] = useState(false);
  const controlsRef = useRef<any>(null);
  const ghostTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ghostStartTimeRef = useRef<number | null>(null);

  // Simple ambient hum using WebAudio API
  const audioRef = useRef<{ ctx: AudioContext | null; osc: OscillatorNode | null; gain: GainNode | null }>({ ctx: null, osc: null, gain: null });
  const [volume, setVolume] = useState(0);
  
  // Background music and ghost sound
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const ghostSoundRef = useRef<HTMLAudioElement | null>(null);
  const kidsLaughRef = useRef<HTMLAudioElement | null>(null);
  const [showObjective, setShowObjective] = useState(false);

  // Handle M to open/close menu (only after game has started)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "m" && hasStarted) {
        setIsMenuOpen((v) => !v);
        setActiveTab("resume");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasStarted]);

  // Auto-hide start notice after 3 seconds
  useEffect(() => {
    if (showStartNotice) {
      const timer = setTimeout(() => {
        setShowStartNotice(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showStartNotice]);

  useEffect(() => {
    if (isMenuOpen && isPointerLocked && controlsRef.current) {
      controlsRef.current.unlock();
    }
  }, [isMenuOpen, isPointerLocked]);

  function handleStart() {
    setHasStarted(true);
    
    // Initialize and play background music
    initBGM();
    playBGM();
    
    // Record when the game started for ghost timing
    ghostStartTimeRef.current = Date.now();
    
    // Request pointer lock after a short delay to ensure user interaction
    setTimeout(() => {
      if (controlsRef.current) {
        try {
          controlsRef.current.lock();
        } catch (error) {
          console.warn("Pointer lock failed:", error);
        }
      }
    }, 100);
    
    // Show flashlight notice after 30 seconds
    setTimeout(() => {
      setShowFlashlightNotice(true);
      setTimeout(() => {
        setShowFlashlightNotice(false);
      }, 3000); // Disappear after 3 seconds
    }, 30000);

    // Start ghost sequence after 12 seconds
    console.log("Starting ghost timer - ghost will appear in 12 seconds");
    ghostTimerRef.current = setTimeout(() => {
      console.log("Ghost timer triggered - making ghost visible");
      
      // Initialize and play ghost sound
      initGhostSound();
      playGhostSound();
      
      setGhostVisible(true);
      setShowSubtitle(true);
      setMovementDisabled(true); // Disable movement when ghost appears
      
      // Move ghost to center over 12 seconds
      const startTime = Date.now();
      const duration = 12000; // 12 seconds
      const startPos = [-5.37, 0, 1.24] as [number, number, number];
      const endPos = [0, 0, 0] as [number, number, number];
      
      const animateGhost = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const newPos = [
          startPos[0] + (endPos[0] - startPos[0]) * progress,
          startPos[1] + (endPos[1] - startPos[1]) * progress,
          startPos[2] + (endPos[2] - startPos[2]) * progress
        ] as [number, number, number];
        
        setGhostPosition(newPos);
        
        if (progress < 1) {
          requestAnimationFrame(animateGhost);
        } else {
          // Ghost reached center, ensure it's at [0, 0, 0]
          setGhostPosition([0, 0, 0]);
          
          // Ghost reached center, now slowly turn to face user over 2 seconds
          const currentUserPos = [coords.x, coords.y, coords.z] as [number, number, number];
          setUserPosition(currentUserPos);
          
          // Calculate rotation to face user
          const dx = currentUserPos[0] - endPos[0];
          const dz = currentUserPos[2] - endPos[2];
          const targetAngle = Math.atan2(dx, dz);
          
          // Animate rotation over 2 seconds
          const rotationStartTime = Date.now();
          const rotationDuration = 2000; // 2 seconds
          
          const animateRotation = () => {
            const elapsed = Date.now() - rotationStartTime;
            const progress = Math.min(elapsed / rotationDuration, 1);
            
            // Smooth rotation interpolation
            const currentAngle = THREE.MathUtils.lerp(0, targetAngle, progress);
            setGhostRotation([0, currentAngle, 0]);
            
            if (progress < 1) {
              requestAnimationFrame(animateRotation);
            } else {
              // Rotation complete, show red glow and prepare to rush
              setGhostGlow(true);
              
              // Wait 1 second, then rush directly to player
              setTimeout(() => {
                // Get current player position
                const playerPos = [coords.x, coords.y, coords.z] as [number, number, number];
                
                // Show objective and play kids laugh
                setShowObjective(true);
                initKidsLaugh();
                playKidsLaugh();
                
                // Rush to player position over 2 seconds
                const rushStartTime = Date.now();
                const rushDuration = 2000; // 2 seconds
                const startPos = [0, 0, 0] as [number, number, number]; // Start from center
                
                const rushToPlayer = () => {
                  const elapsed = Date.now() - rushStartTime;
                  const progress = Math.min(elapsed / rushDuration, 1);
                  
                  // Interpolate position towards player
                  const newPos = [
                    startPos[0] + (playerPos[0] - startPos[0]) * progress,
                    startPos[1] + (playerPos[1] - startPos[1]) * progress,
                    startPos[2] + (playerPos[2] - startPos[2]) * progress
                  ] as [number, number, number];
                  
                  setGhostPosition(newPos);
                  
                  if (progress < 1) {
                    requestAnimationFrame(rushToPlayer);
                  } else {
                    // Ghost reached player, disappear immediately
                    setGhostVisible(false);
                    setShowSubtitle(false);
                    setGhostGlow(false);
                    setShowObjective(false);
                    setMovementDisabled(false); // Re-enable movement
                  }
                };
                
                rushToPlayer();
              }, 1000);
            }
          };
          
          animateRotation();
        }
      };
      
      animateGhost();
    }, 12000);
  }

  function handleResume() {
    setIsMenuOpen(false);
    if (controlsRef.current) {
      try {
        controlsRef.current.lock();
      } catch (error) {
        console.warn("Pointer lock failed on resume:", error);
      }
    }
  }

  function toggleFlashlight() {
    console.log("Flashlight toggle pressed, current state:", flashlightOn);
    setFlashlightOn(prev => {
      console.log("Setting flashlight to:", !prev);
      return !prev;
    });
  }

  const handlePeacockHover = (isHovering: boolean) => {
    setShowPeacockHover(isHovering);
  };

  const handleCameraFlip = () => {
    if (!cameraFlipped) {
      setCameraFlipped(true);
      // Play child laugh sound
      initKidsLaugh();
      playKidsLaugh();
      
      // Flip camera 180 degrees
      if (controlsRef.current) {
        const currentRotation = controlsRef.current.getAzimuthalAngle();
        controlsRef.current.setAzimuthalAngle(currentRotation + Math.PI);
      }
      
      // Reset after 3 seconds
      setTimeout(() => {
        setCameraFlipped(false);
      }, 3000);
    }
  };

  const handlePeacockSwap = () => {
    if (!peacockSwapped) {
      setPeacockSwapped(true);
    }
  };

  function initAudioIfNeeded() {
    if (audioRef.current.ctx) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = 50; // low hum
    gain.gain.value = volume;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    audioRef.current = { ctx, osc, gain };
  }

  function setVolumeSafe(v: number) {
    setVolume(v);
    initAudioIfNeeded();
    if (audioRef.current.gain) audioRef.current.gain.gain.value = v;
  }

  function initBGM() {
    if (bgmRef.current) return;
    try {
      const bgm = new Audio("/bgm1.mp3");
      bgm.loop = false; // Play only once
      bgm.volume = 0.3;
      bgmRef.current = bgm;
    } catch (e) {
      console.warn("BGM not supported:", e);
    }
  }

  function initGhostSound() {
    if (ghostSoundRef.current) return;
    try {
      const ghostSound = new Audio("/I_see_you.mp3");
      ghostSound.volume = 0.8;
      ghostSoundRef.current = ghostSound;
    } catch (e) {
      console.warn("Ghost sound not supported:", e);
    }
  }

  function playBGM() {
    if (bgmRef.current) {
      bgmRef.current.play().catch(e => console.warn("BGM play failed:", e));
    }
  }

  function playGhostSound() {
    if (ghostSoundRef.current) {
      ghostSoundRef.current.currentTime = 0; // Reset to beginning
      ghostSoundRef.current.play().catch(e => console.warn("Ghost sound play failed:", e));
    }
  }

  function initKidsLaugh() {
    if (kidsLaughRef.current) return;
    try {
      const kidsLaugh = new Audio("/kids-laugh-45357.mp3");
      kidsLaugh.volume = 0.7;
      kidsLaughRef.current = kidsLaugh;
    } catch (e) {
      console.warn("Kids laugh sound not supported:", e);
    }
  }

  function playKidsLaugh() {
    if (kidsLaughRef.current) {
      let playCount = 0;
      const maxPlays = 3;
      
      const playOnce = () => {
        if (playCount < maxPlays) {
          kidsLaughRef.current!.currentTime = 0;
          kidsLaughRef.current!.play()
            .then(() => {
              playCount++;
              if (playCount < maxPlays) {
                // Wait for current play to finish, then play again
                setTimeout(playOnce, kidsLaughRef.current!.duration * 1000);
              }
            })
            .catch(e => console.warn("Kids laugh play failed:", e));
        }
      };
      
      playOnce();
    }
  }

  const map = useMemo(
    () => [
      { name: "forward", keys: ["ArrowUp", "KeyW"] },
      { name: "backward", keys: ["ArrowDown", "KeyS"] },
      { name: "left", keys: ["ArrowLeft", "KeyA"] },
      { name: "right", keys: ["ArrowRight", "KeyD"] },
      { name: "flashlight", keys: ["KeyF"] },
    ],
    []
  );

  return (
    <div className="relative h-dvh w-dvw">
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-center justify-between p-4 text-xs text-zinc-400">
        <span>Welcome, {name}</span>
        <span>{isPointerLocked ? "WASD to move • Mouse to look • F for flashlight • M for menu" : "Click to start exploring"}</span>
      </div>

      <CoordinateDisplay coords={coords} />
      
      {/* Start Notice */}
      {showStartNotice && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
          <div className="text-center max-w-2xl mx-4">
            <div className="text-red-500 text-5xl font-bold tracking-wider mb-6 animate-pulse">
              MAKE IT OUT ALIVE!!!!
            </div>
            <div className="text-white text-2xl font-semibold mb-4">
              Press F to get your flashlight
            </div>
            <div className="text-white text-xl">
              M for the main menu
            </div>
            <div className="mt-8 text-yellow-400 text-lg">
              Click to start exploring
            </div>
          </div>
        </div>
      )}

      {/* Debug Display */}
      <div className="fixed top-20 left-4 z-30 bg-black/80 text-white p-3 rounded font-mono text-sm">
        <div>Ghost Visible: {ghostVisible ? 'YES' : 'NO'}</div>
        <div>Movement Disabled: {movementDisabled ? 'YES' : 'NO'}</div>
        <div>Show Subtitle: {showSubtitle ? 'YES' : 'NO'}</div>
        <div>Notice Riddle: {showNoticeRiddle ? 'YES' : 'NO'}</div>
        <div>Flashlight Notice: {showFlashlightNotice ? 'YES' : 'NO'}</div>
        <div>Flashlight: {flashlightOn ? 'ON' : 'OFF'}</div>
        <div>Ghost Position: ({ghostPosition[0].toFixed(2)}, {ghostPosition[1].toFixed(2)}, {ghostPosition[2].toFixed(2)})</div>
      </div>

      {/* Chair Instruction Overlay */}
      {showChairInstruction && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <div className="bg-black/80 backdrop-blur-sm border border-red-500/30 rounded-lg p-8 max-w-md mx-4 text-center animate-pulse">
            <div className="text-red-400 text-2xl font-bold mb-4 tracking-wider">
              ⚠️ LOCKED IN ⚠️
            </div>
            <div className="text-white text-lg leading-relaxed">
              You are trapped in this room. The door is locked and there's no way out through conventional means.
            </div>
            <div className="text-red-300 text-sm mt-4 font-medium">
              Find another way to escape...
            </div>
            <div className="mt-6 text-xs text-gray-400">
              Look around carefully for clues
            </div>
          </div>
        </div>
      )}

      {/* Ghost Subtitle Overlay */}
      {showSubtitle && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <div className="text-center">
            <div className="text-white text-3xl font-bold tracking-wider animate-pulse">
              I see you
            </div>
          </div>
        </div>
      )}


      {/* Flashlight Notice Overlay */}
      {showFlashlightNotice && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <div className="text-center">
            <div className="text-yellow-400 text-3xl font-bold tracking-wider animate-pulse">
              Press F to get your flashlight
            </div>
          </div>
        </div>
      )}

      {/* Peacock Hover Notice */}
      {showPeacockHover && !peacockSwapped && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-400 text-2xl font-bold tracking-wider animate-pulse">
              Look Back
            </div>
          </div>
        </div>
      )}

      {/* Objective Overlay */}
      {showObjective && (
        <div className="pointer-events-none absolute top-1/4 left-1/2 transform -translate-x-1/2 z-30">
          <div className="text-center">
            <div className="text-red-500 text-4xl font-bold tracking-wider animate-pulse">
              This house is haunted, GET OUT!
            </div>
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      {showControls && hasStarted && (
        <div className="pointer-events-none absolute top-4 right-4 z-30 bg-black/80 text-white p-4 rounded-lg text-sm">
          <div className="font-bold mb-2 text-orange-400">Controls</div>
          <div className="space-y-1">
            <div>W/A/S/D — Move</div>
            <div>Mouse — Look</div>
            <div>F — Flashlight</div>
            <div>M — Pause Menu</div>
            <div>Click — Start Game</div>
          </div>
        </div>
      )}

      {/* Health Bar */}
      <div className="pointer-events-none absolute bottom-4 right-4 z-30 bg-black/80 text-white p-3 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="text-sm font-bold text-red-400">Health</div>
          <div className="w-32 h-4 bg-red-900 rounded-full overflow-hidden">
            <div 
              className="h-full bg-red-500 transition-all duration-300"
              style={{ width: `${health}%` }}
            />
          </div>
          <div className="text-xs">{health}%</div>
        </div>
      </div>

      <KeyboardControls map={map as any}>
        <Canvas 
          shadows 
          camera={{ fov: 60, near: 0.1, far: 200 }}
          onClick={() => {
            if (!isPointerLocked && hasStarted) {
              try {
                if (controlsRef.current) {
                  controlsRef.current.lock();
                }
              } catch (error) {
                console.warn("Pointer lock failed on canvas click:", error);
              }
            }
          }}
        >
          <color attach="background" args={["#0a0a0a"]} />
          <Suspense fallback={null}>
            <Lights brightness={brightness} />
            <ChairProximityDetector onProximityChange={setShowChairInstruction} />
            <NoticeBoardProximityDetector onProximityChange={setShowNoticeRiddle} />
            <PeacockHoverDetector 
              onHoverChange={handlePeacockHover}
              onCameraFlip={handleCameraFlip}
              onPeacockSwap={handlePeacockSwap}
            />
            <PlayerBoundary onPositionChange={(pos) => setCoords({ x: pos.x, y: pos.y, z: pos.z })} />
            
            {/* Notice Board */}
            <NoticeBoardModel position={[-0.65, 1.6, -8.82]} rotation={[0, Math.PI / 2, 0]} />
            
            {/* Riddle Text */}
            <RiddleText visible={showNoticeRiddle} />
            
            {/* Peacock */}
            {!peacockSwapped ? (
              <PeacockModel 
                position={[-9.07, 1.6, 8.73]} 
                scale={[0.25, 0.25, 0.25]} 
                rotation={[0, Math.PI, 0]} 
              />
            ) : (
              <DollModel 
                position={[-9.07, 0.5, 8.09]} 
                scale={[10.0, 10.0, 10.0]} 
                rotation={[0, Math.PI + (80 * Math.PI / 180) + Math.PI, 0]} 
              />
            )}
            
            {/* Boundary Walls (invisible) */}
            <group>
              {/* North wall */}
              <mesh position={[0, 2.5, 8.73]} rotation={[0, 0, 0]}>
                <planeGeometry args={[18.28, 5]} />
                <meshBasicMaterial transparent opacity={0} />
              </mesh>
              {/* South wall */}
              <mesh position={[0, 2.5, -8.95]} rotation={[0, 0, 0]}>
                <planeGeometry args={[18.28, 5]} />
                <meshBasicMaterial transparent opacity={0} />
              </mesh>
              {/* East wall */}
              <mesh position={[9.21, 2.5, 0]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[17.68, 5]} />
                <meshBasicMaterial transparent opacity={0} />
              </mesh>
              {/* West wall */}
              <mesh position={[-9.07, 2.5, 0]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[17.68, 5]} />
                <meshBasicMaterial transparent opacity={0} />
              </mesh>
            </group>
            
            {/* Ghost Model */}
            {ghostVisible && (
              <>
                {console.log("Rendering ghost at position:", ghostPosition)}
                <GhostModel 
                  position={ghostPosition} 
                  scale={[0.2, 0.2, 0.2]} 
                  rotation={ghostRotation} 
                  glow={ghostGlow}
                />
              </>
            )}
            
            {/* Basement Room */}
            <group position={[0, 0, 0]}>
              {/* Floor */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                <planeGeometry args={[20, 20]} />
                <meshStandardMaterial color="#2a2a2a" roughness={0.8} />
              </mesh>
              
              {/* Walls */}
              <mesh position={[0, 2.5, -10]} receiveShadow>
                <planeGeometry args={[20, 5]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
              </mesh>
              <mesh position={[0, 2.5, 10]} receiveShadow>
                <planeGeometry args={[20, 5]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
              </mesh>
              <mesh position={[-10, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
                <planeGeometry args={[20, 5]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
              </mesh>
              <mesh position={[10, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
                <planeGeometry args={[20, 5]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
              </mesh>
              
              {/* Ceiling */}
              <mesh position={[0, 5, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[20, 20]} />
                <meshStandardMaterial color="#0f0f0f" roughness={0.8} />
              </mesh>
            </group>

            {/* Wooden Chair */}
            <group position={[0, 0, 0]}>
              {/* Chair seat */}
              <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
                <boxGeometry args={[1.2, 0.1, 1.2]} />
                <meshStandardMaterial color="#8B4513" roughness={0.7} />
              </mesh>
              {/* Chair back */}
              <mesh position={[0, 1.2, -0.5]} castShadow receiveShadow>
                <boxGeometry args={[1.2, 1.6, 0.1]} />
                <meshStandardMaterial color="#8B4513" roughness={0.7} />
              </mesh>
              {/* Chair legs */}
              <mesh position={[-0.5, 0.2, -0.5]} castShadow receiveShadow>
                <boxGeometry args={[0.1, 0.4, 0.1]} />
                <meshStandardMaterial color="#654321" roughness={0.8} />
              </mesh>
              <mesh position={[0.5, 0.2, -0.5]} castShadow receiveShadow>
                <boxGeometry args={[0.1, 0.4, 0.1]} />
                <meshStandardMaterial color="#654321" roughness={0.8} />
              </mesh>
              <mesh position={[-0.5, 0.2, 0.5]} castShadow receiveShadow>
                <boxGeometry args={[0.1, 0.4, 0.1]} />
                <meshStandardMaterial color="#654321" roughness={0.8} />
              </mesh>
              <mesh position={[0.5, 0.2, 0.5]} castShadow receiveShadow>
                <boxGeometry args={[0.1, 0.4, 0.1]} />
                <meshStandardMaterial color="#654321" roughness={0.8} />
              </mesh>
            </group>

            {/* Bloodstains on floor */}
            <group position={[0, 0.01, 0]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[3, 3]} />
                <meshStandardMaterial color="#8B0000" transparent opacity={0.6} />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1, 0, 1]}>
                <planeGeometry args={[1, 1]} />
                <meshStandardMaterial color="#8B0000" transparent opacity={0.4} />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.5, 0, 0.5]}>
                <planeGeometry args={[0.8, 0.8]} />
                <meshStandardMaterial color="#8B0000" transparent opacity={0.5} />
              </mesh>
            </group>

            {/* Lightbulb fixture */}
            <group position={[0, 4.8, 0]}>
              <mesh castShadow>
                <sphereGeometry args={[0.1, 16, 16]} />
                <meshStandardMaterial color="#ffffaa" emissive="#ffff88" emissiveIntensity={0.5} />
              </mesh>
              <mesh position={[0, -0.2, 0]} castShadow>
                <cylinderGeometry args={[0.15, 0.15, 0.3, 8]} />
                <meshStandardMaterial color="#444444" />
              </mesh>
            </group>

            <FirstPersonController movementDisabled={movementDisabled} onFlashlightToggle={toggleFlashlight} />
            <Flashlight enabled={flashlightOn} />
            <PointerLockControls 
              ref={controlsRef}
              onLock={() => setIsPointerLocked(true)}
              onUnlock={() => setIsPointerLocked(false)}
              onError={(error) => {
                console.warn("PointerLockControls error:", error);
                setIsPointerLocked(false);
              }}
            />
            <CanvasCoordReporter onChange={setCoords} />
          </Suspense>
        </Canvas>
      </KeyboardControls>

      {!hasStarted && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50">
          <button
            onClick={handleStart}
            className="rounded-lg bg-orange-600 px-8 py-4 text-xl font-bold text-white hover:bg-orange-500"
          >
            Click to Enter the Room
          </button>
        </div>
      )}

      {isMenuOpen && (
        <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-sm">
          <div className="mx-auto mt-16 w-[min(92vw,880px)] rounded-xl border border-[#3b2a28] bg-[linear-gradient(135deg,rgba(20,10,10,0.95),rgba(10,10,10,0.95))] shadow-[0_0_40px_rgba(255,77,10,0.2)]">
            <div className="flex items-center justify-between border-b border-[#3b2a28] px-6 py-4">
              <div className="text-2xl tracking-widest text-orange-500">PAUSED</div>
              <button onClick={handleResume} className="rounded-md bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-500">Resume</button>
            </div>
            <div className="flex">
              <div className="w-56 border-r border-[#3b2a28] p-4 space-y-2">
                {(["resume","controls","audio","brightness"] as const).map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`block w-full text-left rounded-md px-3 py-2 tracking-wide ${activeTab === tab ? "bg-orange-600/20 text-orange-400" : "hover:bg-zinc-900"}`}>{tab.toUpperCase()}</button>
                ))}
                <a href="/" className="mt-2 block w-full text-left rounded-md px-3 py-2 hover:bg-zinc-900">MAIN MENU</a>
              </div>
              <div className="flex-1 p-6">
                {activeTab === "resume" && (
                  <div className="space-y-4">
                    <p className="text-zinc-300">Press Resume or Enter to continue. Press Esc any time to open this menu.</p>
                    <div className="text-sm text-zinc-400">Position: ({coords.x}, {coords.y}, {coords.z})</div>
                    <div>
                      <button onClick={handleResume} className="rounded-md bg-orange-600 px-5 py-2 text-white hover:bg-orange-500">Resume Game</button>
                    </div>
                  </div>
                )}
                {activeTab === "controls" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded border border-zinc-800 bg-black/40 p-3">W/A/S/D — Move</div>
                      <div className="rounded border border-zinc-800 bg-black/40 p-3">Mouse — Look</div>
                      <div className="rounded border border-zinc-800 bg-black/40 p-3">M — Pause Menu</div>
                      <div className="rounded border border-zinc-800 bg-black/40 p-3">Click — Start Game</div>
                    </div>
                    <div className="space-y-3">
                      <div className="text-sm text-zinc-300">UI Settings</div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-300">Show Controls Overlay</span>
                        <button
                          onClick={() => setShowControls(!showControls)}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            showControls 
                              ? 'bg-orange-600 text-white' 
                              : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                          }`}
                        >
                          {showControls ? 'ON' : 'OFF'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === "audio" && (
                  <div className="space-y-3">
                    <div className="text-sm text-zinc-300">Ambient Hum Volume</div>
                    <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolumeSafe(parseFloat(e.target.value))} className="w-full accent-orange-600" />
                    <div className="text-xs text-zinc-500">Volume: {Math.round(volume * 100)}% (starts on first change)</div>
                  </div>
                )}
                {activeTab === "brightness" && (
                  <div className="space-y-3">
                    <div className="text-sm text-zinc-300">Scene Brightness</div>
                    <input type="range" min={0.4} max={2} step={0.01} value={brightness} onChange={(e) => setBrightness(parseFloat(e.target.value))} className="w-full accent-orange-600" />
                    <div className="text-xs text-zinc-500">Multiplier: {brightness.toFixed(2)}x</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FitCameraToObject({ objectRef, controlsRef }: { objectRef: React.RefObject<THREE.Object3D>; controlsRef?: React.RefObject<any> }) {
  const { camera, gl } = useThree();
  useEffect(() => {
    const obj = objectRef.current;
    if (!obj) return;
    const box = new THREE.Box3().setFromObject(obj);
    if (!box.isEmpty()) {
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      const maxSize = Math.max(size.x, size.y, size.z);
      const fitHeightDistance = maxSize / (2 * Math.tan((Math.PI * camera.fov) / 360));
      const fitWidthDistance = fitHeightDistance / (gl.domElement.clientHeight / gl.domElement.clientWidth);
      const distance = 1.2 * Math.max(fitHeightDistance, fitWidthDistance);

      camera.position.set(center.x + distance, center.y + distance * 0.4, center.z + distance);
      camera.lookAt(center);
      if (controlsRef?.current) {
        controlsRef.current.target.copy(center);
        controlsRef.current.update();
      }
    }
  }, [camera, gl, objectRef, controlsRef]);
  return null;
}

useGLTF.preload("/the_room.glb");
useGLTF.preload("/ghost.glb");
useGLTF.preload("/notice_board_low-poly.glb");
useGLTF.preload("/knight_of_the_blood_order.glb");
useGLTF.preload("/peacock_portrait_smoothie-3d_upload.glb");
useGLTF.preload("/doll.glb");

