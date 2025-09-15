"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, OrbitControls, useGLTF, PointerLockControls, KeyboardControls, useKeyboardControls } from "@react-three/drei";
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

function FirstPersonController() {
  const { camera } = useThree();
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const [, getKeys] = useKeyboardControls();

  useEffect(() => {
    camera.position.set(0, 1.6, 5);
  }, [camera]);

  useFrame((_, delta) => {
    const move = getKeys();
    const speed = 5;

    direction.current.set(0, 0, 0);
    // Ensure W moves forward in view direction, A strafes left
    if (move.forward) direction.current.z += 1;
    if (move.backward) direction.current.z -= 1;
    if (move.left) direction.current.x += 1;
    if (move.right) direction.current.x -= 1;
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

export default function GamePage() {
  const params = useSearchParams();
  const name = params.get("name") || "Player";
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0, z: 0 });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"resume" | "controls" | "audio" | "brightness">("resume");
  const [brightness, setBrightness] = useState(1);
  const controlsRef = useRef<any>(null);

  // Simple ambient hum using WebAudio API
  const audioRef = useRef<{ ctx: AudioContext | null; osc: OscillatorNode | null; gain: GainNode | null }>({ ctx: null, osc: null, gain: null });
  const [volume, setVolume] = useState(0);

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

  useEffect(() => {
    if (isMenuOpen && isPointerLocked && controlsRef.current) {
      controlsRef.current.unlock();
    }
  }, [isMenuOpen, isPointerLocked]);

  function handleStart() {
    setHasStarted(true);
    if (controlsRef.current) controlsRef.current.lock();
  }

  function handleResume() {
    setIsMenuOpen(false);
    if (controlsRef.current) controlsRef.current.lock();
  }

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

  const map = useMemo(
    () => [
      { name: "forward", keys: ["ArrowUp", "KeyW"] },
      { name: "backward", keys: ["ArrowDown", "KeyS"] },
      { name: "left", keys: ["ArrowLeft", "KeyA"] },
      { name: "right", keys: ["ArrowRight", "KeyD"] },
    ],
    []
  );

  return (
    <div className="relative h-dvh w-dvw">
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-center justify-between p-4 text-xs text-zinc-400">
        <span>Welcome, {name}</span>
        <span>{isPointerLocked ? "WASD to move • Mouse to look • M for menu" : "Click to start exploring"}</span>
      </div>

      <CoordinateDisplay coords={coords} />

      <KeyboardControls map={map as any}>
        <Canvas shadows camera={{ fov: 60, near: 0.1, far: 200 }}>
          <color attach="background" args={["#0a0a0a"]} />
          <Suspense fallback={null}>
            <Lights brightness={brightness} />
            
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

            <FirstPersonController />
            <PointerLockControls 
              ref={controlsRef}
              onLock={() => setIsPointerLocked(true)}
              onUnlock={() => setIsPointerLocked(false)}
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
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded border border-zinc-800 bg-black/40 p-3">W/A/S/D — Move</div>
                    <div className="rounded border border-zinc-800 bg-black/40 p-3">Mouse — Look</div>
                    <div className="rounded border border-zinc-800 bg-black/40 p-3">M — Pause Menu</div>
                    <div className="rounded border border-zinc-800 bg-black/40 p-3">Click — Start Game</div>
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

