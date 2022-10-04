### Downscaler
An efficient image downscaler completely on device.

# How fast is it?
Well, it depends on the image and your CPU.
For a 4032x3024 image taken on my iPhone 13, it took about 7 seconds on both node.js and chrome. (on my Core i5-10400)

# Well, how about quality?
It preserves the quality pretty well. From the outside the quality difference should be unnoticable unless you have a really low resolution image.
If you zoom in you might notice a tiny difference though.

# My colors are ruined!
If you're sure it's not in the original image, please submit an issue with the original and the output image.
If you're using an image with completely different colors every pixel, the way it computes the output color for each pixel doesn't work very well with those.

# How does it work?
#### First, it divides the image into 2x2 blocks and loops over it.
#### In the loop, it takes the color values of every pixel in the block and appends it to an array.
#### Then, it takes the color values of each pixel and then computes the output color for the output pixel.
- If every color in the block is the same, it returns the first pixel's color.
- If not, it checks if the color of the first pixel and fourth or second pixel match. If so, it sets the first temporary color to the color of the first pixel.
    - If this doesn't work, it is set to the average of the RGBA of the first and fourth pixel.
- It also checks if the color third pixel and the fourth or second pixel match. If so, it sets the second temporary color to the color of the third pixel.
    - If this doesn't work, it is set to the average of the RGBA of the second and third pixel.
- Finally, it returns the average of the first and second temporary color.
#### Then, it appends the RGBA values of that block into an array.
#### Finally, it puts the data into an image and then saves/opens it.

# Why?
I got bored.