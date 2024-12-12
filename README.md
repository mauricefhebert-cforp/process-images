# Installation and usage of the script

**You will need to be authentified to adobe.stock website!**

1. Install tampermonkey on the chrome webstore
    [Tampermonkey.net]('https://www.tampermonkey.net/index.php?browser=chrome#google_vignette')

2. Create a new script in tampermonkey copy/paste the content of adobeImageDownloaderUserScript.js in the newly created script

3. Install the npm script first navigate to the folder where you unzip clone this repository the do `npm install -g .`

4. Run the script `process-images /path/to/docx/file.docx` optionally you can add a seconde argument to move the image to a specificy folder like `process-images /path/to/docx/file.docx /directory/where/to/move/image`

