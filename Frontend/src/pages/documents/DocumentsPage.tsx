import React, { useEffect, useState } from 'react';
import { FileText, Upload, Download, CheckCircle } from 'lucide-react';
import { Document as PDFDocument, Page, pdfjs } from 'react-pdf';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Document } from '../../types';
import { getDocuments, uploadDocument, uploadDocumentSignature } from '../../data/documents';
import { API_BASE_URL } from '../../config';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const resolveAssetUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL || ''}${url}`;
};

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'draft' | 'pending_review' | 'approved' | 'archived'>('draft');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const loadDocuments = async () => {
    try {
      setDocuments(await getDocuments());
    } catch (error) {
      console.error(error);
      setMessage('Unable to load documents.');
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) return;

    setUploading(true);
    setMessage('');

    try {
      const document = await uploadDocument(file, status);
      setDocuments((prev) => [document, ...prev]);
      setFile(null);
      setMessage('Document uploaded successfully.');
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleSignatureUpload = async () => {
    if (!selectedDoc || !signatureFile) return;

    setUploading(true);
    setMessage('');

    try {
      const document = await uploadDocumentSignature(selectedDoc.id, signatureFile);
      setSelectedDoc(document);
      setDocuments((prev) => prev.map((doc) => (doc.id === document.id ? document : doc)));
      setSignatureFile(null);
      setMessage('Signature uploaded successfully.');
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages: pages }: { numPages: number }) => {
    setNumPages(pages);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600">Upload, preview and sign your business files.</p>
        </div>

        <form onSubmit={handleUpload} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="file"
            accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/*"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600"
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as Document['status'])}
            className="rounded-md border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="draft">Draft</option>
            <option value="pending_review">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="archived">Archived</option>
          </select>
          <Button type="submit" disabled={!file || uploading} leftIcon={<Upload size={18} />}>
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </form>
      </div>

      {message && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Document Library</h2>
            </CardHeader>
            <CardBody className="space-y-2">
              {documents.length === 0 ? (
                <p className="text-sm text-gray-500">No documents uploaded yet.</p>
              ) : (
                documents.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setSelectedDoc(doc)}
                    className={`w-full rounded-lg border p-4 text-left transition ${
                      selectedDoc?.id === doc.id ? 'border-primary-600 bg-primary-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-md bg-primary-50 p-2 text-primary-600">
                          <FileText size={20} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">{doc.fileName}</p>
                          <p className="text-xs text-gray-500">v{doc.version} • {doc.status.replace('_', ' ')}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" size="sm">{doc.storageProvider.toUpperCase()}</Badge>
                    </div>
                  </button>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Upload Signature</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <p className="text-sm text-gray-500">Upload an image signature to attach to the selected document.</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setSignatureFile(event.target.files?.[0] ?? null)}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600"
                />
                <Button
                  disabled={!selectedDoc || !signatureFile || uploading}
                  onClick={handleSignatureUpload}
                  leftIcon={<CheckCircle size={18} />}
                >
                  {uploading ? 'Saving...' : 'Upload Signature'}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Preview</h2>
                <p className="text-sm text-gray-500">View selected documents directly in the browser.</p>
              </div>
              {selectedDoc && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedDoc(null)}>
                  Close
                </Button>
              )}
            </CardHeader>
            <CardBody>
              {selectedDoc ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-medium text-gray-900">{selectedDoc.fileName}</p>
                        <p className="text-sm text-gray-500">{Math.round(selectedDoc.size / 1024)} KB • {selectedDoc.contentType}</p>
                      </div>
                      <a
                        href={resolveAssetUrl(selectedDoc.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-500"
                      >
                        <Download size={16} /> Open raw
                      </a>
                    </div>
                  </div>

                  {selectedDoc.contentType === 'application/pdf' ? (
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                      <PDFDocument
                        file={resolveAssetUrl(selectedDoc.previewUrl || selectedDoc.url)}
                        onLoadSuccess={onDocumentLoadSuccess}
                      >
                        <Page pageNumber={currentPage} />
                      </PDFDocument>
                      {numPages && (
                        <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
                          <span>Page {currentPage} of {numPages}</span>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
                              Prev
                            </Button>
                            <Button variant="outline" size="sm" disabled={currentPage >= numPages} onClick={() => setCurrentPage((page) => Math.min(numPages, page + 1))}>
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
                      PDF preview is available for PDF documents only.
                    </div>
                  )}

                  {selectedDoc.signatureUrl ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-900">Signature available</p>
                          <p className="text-sm text-gray-500">A signature image has been attached to this document.</p>
                        </div>
                        <a href={resolveAssetUrl(selectedDoc.signatureUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-500">
                          View signature
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500">
                      No signature uploaded for this document yet.
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
                  Select a document to preview and sign it.
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};
