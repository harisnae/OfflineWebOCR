# TrOCR / Donut — Offline OCR Demo (Transformers.js)

[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Deploy to GitHub Pages](https://img.shields.io/badge/Deploy%20to-GitHub%20Pages-blue)](https://pages.github.com/)

## Overview

This project demonstrates a privacy-focused Optical Character Recognition (OCR) application built using Transformers.js.  It allows users to extract text from images *entirely offline* after loading a pre-trained model.  **No internet connection is required for OCR processing once the model is loaded.**  This ensures complete data privacy, as no images or data are ever transmitted to a server.  The application is designed to be easily deployable as a static website, such as on GitHub Pages, requiring no backend infrastructure or inference servers.

## Key Features

*   **Offline OCR:**  The core functionality is performing OCR locally in the browser, guaranteeing data privacy.  Once the model is downloaded, the application functions without an internet connection.
*   **Privacy-Focused:**  All image data stays in the browser and no data is sent to external servers.
*   **Model Variety:** Supports both single-line (TrOCR) and multi-line (Donut) OCR models. Choose the appropriate model based on your needs:
    *   **TrOCR:** Ideal for extracting text from single lines, such as scanned documents or cropped images.
    *   **Donut:**  Designed for document OCR, capable of handling full-page screenshots and complex layouts.
*   **Model Selection:**  A dropdown menu allows users to select from several pre-trained models.
*   **Image Input:**  Users can upload images directly from their computer or load a sample screenshot.
*   **Cropping (Optional):**  A basic cropping tool allows users to select a specific region of the image for OCR, improving accuracy and performance.
*   **Raw Output & Decoded Text:** Displays both the raw JSON output from the OCR pipeline and the decoded text.
*   **Copy to Clipboard:**  Easily copy the extracted text to the clipboard.
*   **No Backend Required:**  The application is entirely client-side and does not require any server-side components or inference APIs.
*   **Easy Deployment:**  Can be deployed as a static website on platforms like GitHub Pages.

## How it Works

1.  **Model Loading:** The application uses the `@xenova/transformers` library to load a pre-trained OCR model directly in the browser. This process may take some time, especially for larger models. A progress bar indicates the loading status.
2.  **Offline Functionality:** Once the model is loaded, it is cached in the browser.  The application can then perform OCR on images even without an internet connection.
3.  **Image Processing:** When an image is uploaded, it is displayed on a canvas element.  The user can optionally crop the image to focus on the relevant text.
4.  **OCR Pipeline:** The selected OCR model (TrOCR or Donut) is used to extract text from the image.
5.  **Output:** The extracted text is displayed in a text area, along with the raw JSON output from the OCR pipeline.

## Technologies Used

*   **HTML, CSS, javascript-protocol:**  The core web technologies.
*   **Transformers.js (@xenova/transformers):**  A JavaScript library for running transformer models in the browser.  [https://xenova.io/transformers/](https://xenova.io/transformers/)
*   **Web Workers:** Used to offload the computationally intensive OCR tasks from the main thread, ensuring a responsive user interface.

## Demo
https://harisnae.github.io/OfflineWebOCR/

## Getting Started

1.  **Clone the Repository:**

    ```bash
    git clone https://github.com/harisnae/OfflineWebOCR/
    cd OfflineWebOCR
    ```

2.  **Open `index.html` in your browser:**  Simply open the `index.html` file in any modern web browser.

## Deployment

This application is designed to be easily deployed as a static website. Here's how to deploy it to GitHub Pages:

1.  **Create a GitHub Repository:** Create a new public repository on GitHub.
2.  **Push the Code:** Push the contents of this project to the repository.
3.  **Enable GitHub Pages:**
    *   Go to your repository's settings.
    *   Navigate to the "Pages" section.
    *   Select the `main` branch (or the branch containing your code) as the source.
    *   GitHub Pages will automatically deploy your website.

# Acknowledgements

* **@xenova/transformers** – JavaScript port of Hugging Face Transformers, enabling on‑device inference.  
* **TrOCR** – Microsoft’s Transformer‑based OCR model for handwritten/printed single lines.  
* **Donut** – Layout‑aware document OCR model from the same research group.  
* **GitHub Pages** – For providing a free static‑site hosting platform.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

The accuracy of the OCR results depends on the quality of the image and the selected model.  The application is provided "as is" without any warranty.  Use at your own risk.
