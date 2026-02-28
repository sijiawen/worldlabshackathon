"use client"

import { useDropzone } from "react-dropzone"

export default function ModelDropzone({onFile}) {

  const {getRootProps, getInputProps} = useDropzone({
    onDrop: (acceptedFiles)=>{
      onFile(acceptedFiles[0])
    }
  })

  return (
    <div {...getRootProps()} style={{
      position:"absolute",
      top:20,
      left:20,
      padding:20,
      background:"#222",
      color:"white"
    }}>
      <input {...getInputProps()} />
      Drop GLB file here
    </div>
  )
}