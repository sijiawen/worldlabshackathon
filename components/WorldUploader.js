"use client"

export default function WorldUploader({onWorld}){

  async function handleFile(e){

    const file = e.target.files[0]

    const formData = new FormData()
    formData.append("image",file)

    const res = await fetch("/api/world",{
      method:"POST",
      body:formData
    })

    const data = await res.json()

    onWorld(data.worldUrl)

  }

  return (
    <div style={{
      position:"absolute",
      top:80,
      left:20,
      background:"black",
      padding:10,
      color:"white"
    }}>
      <input type="file" onChange={handleFile}/>
    </div>
  )
}