export async function preprocessImageForOCR(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(file)

        img.onload = () => {
            URL.revokeObjectURL(url)
            const canvas = document.createElement("canvas")
            const ctx = canvas.getContext("2d")

            if (!ctx) return reject(new Error("Canvas context not available"))

            // Upscale image 2x for better OCR recognition of small text
            canvas.width = img.width * 2
            canvas.height = img.height * 2

            // Draw image scaled up
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

            // Get image data to manipulate pixels
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const data = imageData.data

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i]
                const g = data[i + 1]
                const b = data[i + 2]

                // Convert to grayscale
                const gray = 0.299 * r + 0.587 * g + 0.114 * b

                // Increase contrast by stretching histogram towards black/white
                // Simple thresholding: if it's darker than 150, make it darker, else make it lighter
                const threshold = 160
                const contrasted = gray > threshold ? 255 : Math.max(0, gray - 50)

                data[i] = contrasted     // R
                data[i + 1] = contrasted // G
                data[i + 2] = contrasted // B
                // Alpha remains same
            }

            ctx.putImageData(imageData, 0, 0)

            // Return as base64 JPEG
            resolve(canvas.toDataURL("image/jpeg", 1.0))
        }

        img.onerror = () => reject(new Error("Failed to load image for preprocessing"))
        img.src = url
    })
}
