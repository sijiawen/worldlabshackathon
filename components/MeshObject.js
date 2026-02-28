"use client"
import { useRef, useState } from "react"
import { useLoader } from "@react-three/fiber"
import { GLTFLoader } from "three-stdlib"
import { PLYLoader } from "three-stdlib"
import * as THREE from "three"
import { Box, Sphere, Cylinder } from "@react-three/drei"

// Handles GLB, PLY, or primitives
export default function MeshObject({ url, onClick }) {
  const isPrimitive = url?.startsWith("__primitive__")

  if (isPrimitive) {
    const shape = url.replace("__primitive__", "")
    return <PrimitiveMesh shape={shape} onClick={onClick} />
  }

  const ext = url?.split(".").pop()?.toLowerCase()?.split("?")?.[0]

  if (ext === "ply") {
    return <PLYMesh url={url} onClick={onClick} />
  }

  return <GLBMesh url={url} onClick={onClick} />
}

function GLBMesh({ url, onClick }) {
  const gltf = useLoader(GLTFLoader, url)
  return (
    <primitive
      object={gltf.scene}
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
    />
  )
}

function PLYMesh({ url, onClick }) {
  const geometry = useLoader(PLYLoader, url)
  const matRef = useRef()

  return (
    <points onClick={(e) => { e.stopPropagation(); onClick?.() }}>
      <primitive object={geometry} attach="geometry" />
      <pointsMaterial
        ref={matRef}
        size={0.01}
        vertexColors={geometry.hasAttribute("color")}
        color={geometry.hasAttribute("color") ? undefined : "#ffc850"}
      />
    </points>
  )
}

function PrimitiveMesh({ shape, onClick }) {
  const props = {
    onClick: (e) => { e.stopPropagation(); onClick?.() },
    castShadow: true,
    receiveShadow: true,
  }

  const mat = (
    <meshStandardMaterial
      color="#888aaa"
      roughness={0.6}
      metalness={0.1}
    />
  )

  if (shape === "box") return <Box args={[1, 1, 1]} {...props}>{mat}</Box>
  if (shape === "sphere") return <Sphere args={[0.5, 32, 32]} {...props}>{mat}</Sphere>
  if (shape === "cylinder") return <Cylinder args={[0.5, 0.5, 1, 32]} {...props}>{mat}</Cylinder>

  return null
}
