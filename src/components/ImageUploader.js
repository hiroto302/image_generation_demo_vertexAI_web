export class ImageUploader {
  constructor(zoneId, inputId, previewId, placeholderId) {
    this.zone = document.getElementById(zoneId);
    this.input = document.getElementById(inputId);
    this.preview = document.getElementById(previewId);
    this.placeholder = document.getElementById(placeholderId);
    this.file = null;
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.zone.addEventListener('click', () => this.input.click());
    this.input.addEventListener('change', (e) => this.handleFileSelect(e));
    this.zone.addEventListener('dragenter', (e) => this.handleDragEnter(e));
    this.zone.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.zone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    this.zone.addEventListener('drop', (e) => this.handleDrop(e));
    this.preview.querySelector('.remove-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.clearFile();
    });
  }

  handleDragEnter(e) {
    e.preventDefault();
    this.zone.classList.add('drag-over');
  }

  handleDragOver(e) {
    e.preventDefault();
  }

  handleDragLeave(e) {
    e.preventDefault();
    this.zone.classList.remove('drag-over');
  }

  handleDrop(e) {
    e.preventDefault();
    this.zone.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      this.setFile(files[0]);
    }
  }

  handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
      this.setFile(files[0]);
    }
  }

  validateFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return false;
    }
    return true;
  }

  setFile(file) {
    if (!this.validateFile(file)) return;
    this.file = file;
    this.showPreview(file);
  }

  showPreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.preview.querySelector('img').src = e.target.result;
      this.placeholder.style.display = 'none';
      this.preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }

  clearFile() {
    this.file = null;
    this.input.value = '';
    this.placeholder.style.display = 'flex';
    this.preview.style.display = 'none';
    this.preview.querySelector('img').src = '';
  }

  getFile() {
    return this.file;
  }
}
