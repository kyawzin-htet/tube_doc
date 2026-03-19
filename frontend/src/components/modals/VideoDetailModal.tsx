import { useState } from 'react';
import axios from 'axios';
import { Check, Copy, Download, ExternalLink, Loader2, Save, X } from 'lucide-react';
import { API_BASE } from '../../lib/config';
import { authHeaders } from '../../lib/http';
import type { Video } from '../../types/app';

interface VideoDetailModalProps {
  token: string;
  video: Video;
  onClose: () => void;
}

export function VideoDetailModal({ token, video, onClose }: VideoDetailModalProps) {
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [downloading, setDownloading] = useState<'pdf' | 'docx' | null>(null);

  const processingLabel =
    video.processingMethod === 'transcript_api'
      ? 'Transcript API'
      : video.processingMethod === 'gemini'
        ? 'Gemini'
        : 'Whisper';

  const handleCopy = () => {
    navigator.clipboard.writeText(video.summary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleDownload = async (formatType: 'pdf' | 'docx') => {
    try {
      setDownloading(formatType);
      const response = await axios.get(`${API_BASE}/videos/${video.id}/download`, {
        params: { format: formatType },
        responseType: 'blob',
        headers: authHeaders(token),
      });

      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeTitle = (video.title || video.videoId || 'summary')
        .replace(/[^\w\-]+/g, '_')
        .slice(0, 80);
      link.href = url;
      link.download = `${safeTitle}.${formatType}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed', error);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content detail-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header detail-modal-header">
          <div className="detail-modal-heading">
            <span className="section-label">Translation</span>
            <h2>{video.title}</h2>
            <div className="modal-meta">
              <span className="badge subtle-badge">{processingLabel}</span>
              <a className="detail-link" href={video.videoUrl} target="_blank" rel="noopener noreferrer">
                View on YouTube <ExternalLink size={13} />
              </a>
            </div>
          </div>
          <button className="ghost-btn icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body detail-modal-body">
          <div className="section-header detail-section-header">
            <h3>Summary</h3>
            <div className="inline-actions detail-inline-actions">
              <button
                className={`ghost-btn icon-btn ${copiedSummary ? 'success-outline' : ''}`}
                onClick={handleCopy}
                aria-label={copiedSummary ? 'Copied' : 'Copy summary'}
                title={copiedSummary ? 'Copied' : 'Copy summary'}
              >
                {copiedSummary ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button
                className="ghost-btn icon-btn"
                onClick={() => handleDownload('pdf')}
                disabled={downloading !== null}
                aria-label="Download PDF"
                title="Download PDF"
              >
                {downloading === 'pdf' ? <Loader2 className="spinning" size={14} /> : <Download size={14} />}
              </button>
              <button
                className="ghost-btn icon-btn"
                onClick={() => handleDownload('docx')}
                disabled={downloading !== null}
                aria-label="Download DOCX"
                title="Download DOCX"
              >
                {downloading === 'docx' ? <Loader2 className="spinning" size={14} /> : <Save size={14} />}
              </button>
            </div>
          </div>

          <div className="content-box detail-summary-box">{video.summary}</div>
        </div>
      </div>
    </div>
  );
}
