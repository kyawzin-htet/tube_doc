import type { FormEvent } from 'react';
import { format } from 'date-fns';
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { LANGUAGE_OPTIONS } from '../../constants/languages';
import type { StatusPayload, UserProfile, Video } from '../../types/app';

interface WorkspacePanelProps {
  currentUser: UserProfile;
  currentUsageRemainingToday: number;
  url: string;
  language: string;
  isProcessing: boolean;
  currentStatus: StatusPayload | null;
  hasPartialSummary: boolean;
  progress: number;
  error: string | null;
  videos: Video[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onUrlChange: (value: string) => void;
  onLanguageChange: (value: string) => void;
  onProcess: (event: FormEvent) => void;
  onCancel: () => void;
  onSelectVideo: (video: Video) => void;
  onRequestDelete: (video: Video) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

export function WorkspacePanel({
  currentUser,
  currentUsageRemainingToday,
  url,
  language,
  isProcessing,
  currentStatus,
  hasPartialSummary,
  progress,
  error,
  videos,
  currentPage,
  totalPages,
  totalCount,
  onUrlChange,
  onLanguageChange,
  onProcess,
  onCancel,
  onSelectVideo,
  onRequestDelete,
  onPreviousPage,
  onNextPage,
}: WorkspacePanelProps) {
  return (
    <>
      <section className="card compose-card">
        <div className="section-header">
          <div>
            <h2>New translation</h2>
            <p className="muted">
              Paste a YouTube URL, choose the output language, and process it under your account.
            </p>
          </div>
          <span className="badge subtle-badge">{currentUsageRemainingToday} left today</span>
        </div>

        <form onSubmit={onProcess}>
          <div className="input-group">
            <input
              type="text"
              placeholder="Paste a YouTube URL"
              value={url}
              onChange={(event) => onUrlChange(event.target.value)}
              disabled={isProcessing || currentUser.isRestricted}
            />
            <select
              value={language}
              onChange={(event) => onLanguageChange(event.target.value)}
              disabled={isProcessing || currentUser.isRestricted}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="primary-btn icon-btn"
              disabled={isProcessing || !url || currentUser.isRestricted}
              aria-label="Process translation"
              title="Process translation"
            >
              {isProcessing ? <Loader2 className="spinning" size={16} /> : <Send size={16} />}
            </button>
            {isProcessing && (
              <button
                type="button"
                className="ghost-btn icon-btn"
                onClick={onCancel}
                aria-label="Cancel processing"
                title="Cancel processing"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </form>

        {currentUser.isRestricted && (
          <div className="inline-error top-space">
            <AlertCircle size={16} />
            <span>Your account is restricted by an administrator.</span>
          </div>
        )}

        {currentStatus &&
          (isProcessing ||
            currentStatus.status === 'completed' ||
            currentStatus.status === 'error' ||
            hasPartialSummary) && (
            <div className="status-box">
              <div className="status-message">
                {currentStatus.status === 'completed' ? (
                  <CheckCircle className="text-success" size={16} />
                ) : currentStatus.status === 'error' ? (
                  <AlertCircle className="text-error" size={16} />
                ) : (
                  <Loader2 className="spinning" size={16} />
                )}
                <span>{currentStatus.message}</span>
              </div>

              {(currentStatus.data?.currentChunk ||
                currentStatus.data?.totalChunks ||
                progress > 0) && (
                <div className="progress-block">
                  <div className="progress-meta">
                    <span>
                      {currentStatus.data?.currentChunk && currentStatus.data?.totalChunks
                        ? `Chunk ${currentStatus.data.currentChunk} of ${currentStatus.data.totalChunks}`
                        : 'Processing'}
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {hasPartialSummary && (
                <div className="top-space">
                  <div className="section-label">Live summary draft</div>
                  <div className="content-box scroll-box">{currentStatus.data?.partialSummary}</div>
                </div>
              )}
            </div>
          )}

        {error && (
          <div className="inline-error top-space">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
      </section>

      {totalCount > 0 && (
        <section className="card table-card">
          <div className="section-header">
            <h2>Saved translations</h2>
            <span className="muted small">
              {totalCount} record{totalCount !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Preview</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((video) => (
                  <tr key={video.id} onClick={() => onSelectVideo(video)}>
                    <td>
                      <div className="table-title">{video.title}</div>
                      <div className="table-subtitle">{video.videoId}</div>
                    </td>
                    <td>
                      <div className="summary-text">{video.summary}</div>
                    </td>
                    <td>{format(new Date(video.createdAt), 'MMM d')}</td>
                    <td>
                      <div className="inline-actions" onClick={(event) => event.stopPropagation()}>
                        <button
                          className="ghost-btn icon-btn"
                          onClick={() => onSelectVideo(video)}
                          aria-label="View translation"
                          title="View translation"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className="ghost-btn icon-btn danger-outline"
                          onClick={() => onRequestDelete(video)}
                          aria-label="Delete translation"
                          title="Delete translation"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <span className="muted small">
                Page {currentPage} of {totalPages}
              </span>
              <div className="inline-actions">
                <button
                  className="ghost-btn icon-btn"
                  onClick={onPreviousPage}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                  title="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  className="ghost-btn icon-btn"
                  onClick={onNextPage}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                  title="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </>
  );
}
