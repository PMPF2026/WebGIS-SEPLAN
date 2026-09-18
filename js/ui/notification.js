/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Toast Notification System
 */

export class Notification {
  static show(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'warning') icon = 'alert-triangle';
    if (type === 'error') icon = 'alert-octagon';

    toast.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <i class="lucide-${icon}"></i>
        <span>${message}</span>
      </div>
      <button class="toast-close">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      toast.remove();
    });

    container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 250);
      }, duration);
    }
  }

  static success(msg) { this.show(msg, 'success'); }
  static warning(msg) { this.show(msg, 'warning'); }
  static error(msg) { this.show(msg, 'error'); }
  static info(msg) { this.show(msg, 'info'); }
}
