"use client"

import { useEffect } from "react"
import * as GaussianSplats3D from "@mkkellogg/gaussian-splats-3d"

export default function WorldScene({url}){

  useEffect(()=>{

    if(!url) return

    const viewer = new GaussianSplats3D.Viewer({
      container: document.getElementById("world-container")
    })

    viewer.addSplatScene(url)

  },[url])

  return (
    <div
      id="world-container"
      style={{
        position:"absolute",
        width:"100%",
        height:"100%",
        zIndex:-1
      }}
    />
  )
}