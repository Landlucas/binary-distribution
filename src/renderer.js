let uploadButton;

window.onload = () => {
  uploadButton = document.querySelector('.upload-button');
  uploadButton.addEventListener('click', () => {
    window.api.send('openDialog', '');
  });
}

window.api.receive('toRenderer', (data) => {
  console.log(`${data}`);
});

const downloadFile = (el) => {
  console.log(`Downloading ${el.textContent}...`);
  window.api.send('downloadFile', el.textContent);
}
