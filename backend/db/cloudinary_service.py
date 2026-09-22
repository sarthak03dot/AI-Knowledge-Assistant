"""
Cloudinary Cloud Storage Integration for Documents (PDF, DOCX, XLSX, TXT, etc.)
Handles secure document uploading, URL generation, and metadata tracking.
"""

import os
import io
import time
from typing import Dict, Any, Optional

try:
    import cloudinary
    import cloudinary.uploader
    import cloudinary.api
    HAS_CLOUDINARY = True
except ImportError:
    HAS_CLOUDINARY = False

# Auto-load .env if not already loaded
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENV_FILE = os.path.join(BASE_DIR, ".env")
if os.path.exists(ENV_FILE):
    with open(ENV_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                if k.strip() not in os.environ:
                    os.environ[k.strip()] = v.strip()


class CloudinaryStorageService:
    def __init__(self):
        self.cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
        self.api_key = os.getenv("CLOUDINARY_API_KEY")
        self.api_secret = os.getenv("CLOUDINARY_API_SECRET")
        self.cloudinary_url = os.getenv("CLOUDINARY_URL")
        self.is_configured = False
        self._init_client()

    def _init_client(self):
        if not HAS_CLOUDINARY:
            print("[CloudinaryService] 'cloudinary' package is not installed.")
            return

        if self.cloud_name and self.api_key and self.api_secret:
            cloudinary.config(
                cloud_name=self.cloud_name,
                api_key=self.api_key,
                api_secret=self.api_secret,
                secure=True,
            )
            self.is_configured = True
            print(f"[CloudinaryService] ✅ Configured with Cloud Name: '{self.cloud_name}'")
        elif self.cloudinary_url:
            cloudinary.config(cloudinary_url=self.cloudinary_url, secure=True)
            self.is_configured = True
            print("[CloudinaryService] ✅ Configured via CLOUDINARY_URL")
        else:
            print("[CloudinaryService] ⚠️ Cloudinary credentials not fully specified in environment.")

    def upload_file(
        self,
        file_bytes: bytes,
        filename: str,
        folder: str = "nexusrag_docs",
        doc_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Uploads a raw document byte stream to Cloudinary storage.
        Returns a dictionary with the secure URL, public ID, format, and size.
        """
        if not self.is_configured or not HAS_CLOUDINARY:
            return {
                "success": False,
                "url": None,
                "secure_url": None,
                "public_id": None,
                "error": "Cloudinary is not configured or module unavailable",
            }

        try:
            clean_name = os.path.splitext(filename)[0]
            ext = os.path.splitext(filename)[1].lower().lstrip(".")
            public_id = f"{doc_id}_{clean_name}" if doc_id else f"{clean_name}_{int(time.time())}"

            file_obj = io.BytesIO(file_bytes)
            file_obj.name = filename

            # Upload documents with access_mode='public'
            # For PDF and raw office documents, upload to Cloudinary storage
            upload_params = {
                "folder": folder,
                "public_id": public_id,
                "resource_type": "auto",
                "use_filename": True,
                "unique_filename": False,
                "overwrite": True,
            }

            response = cloudinary.uploader.upload(
                file_obj,
                **upload_params,
            )

            res_public_id = response.get("public_id") or public_id
            res_type = response.get("resource_type", "auto")

            # Try generating signed secure URL
            secure_url = response.get("secure_url") or response.get("url")
            try:
                signed_url, _ = cloudinary.utils.cloudinary_url(
                    res_public_id,
                    resource_type=res_type,
                    sign_url=True,
                    secure=True,
                )
                if signed_url:
                    secure_url = signed_url
            except Exception:
                pass

            print(f"[CloudinaryService] 🚀 File '{filename}' uploaded successfully: {secure_url}")
            return {
                "success": True,
                "secure_url": secure_url,
                "url": response.get("url"),
                "public_id": res_public_id,
                "resource_type": res_type,
                "format": response.get("format") or ext,
                "bytes": response.get("bytes", len(file_bytes)),
                "created_at": response.get("created_at"),
            }
        except Exception as e:
            print(f"[CloudinaryService] ❌ Upload failed for '{filename}': {e}")
            return {
                "success": False,
                "secure_url": None,
                "public_id": None,
                "error": str(e),
            }

    def get_signed_url(self, public_id: str, format: Optional[str] = None, resource_type: str = "image") -> str:
        """Generates a signed URL with HMAC authentication token from Cloudinary."""
        if not self.is_configured or not HAS_CLOUDINARY:
            return ""
        try:
            url, _ = cloudinary.utils.cloudinary_url(
                public_id,
                resource_type=resource_type,
                format=format,
                sign_url=True,
                secure=True,
            )
            return url
        except Exception:
            return ""

    def get_private_download_url(self, public_id: str, format: Optional[str] = None, resource_type: str = "image") -> str:
        """Generates an authorized private download URL from Cloudinary API that bypasses 401 delivery blocks."""
        if not self.is_configured or not HAS_CLOUDINARY:
            return ""
        try:
            return cloudinary.utils.private_download_url(
                public_id,
                format=format or "pdf",
                resource_type=resource_type,
            )
        except Exception:
            return ""

    def get_page_image_url(self, public_id: str, page: int = 1, width: int = 1200) -> str:
        """Generates a Cloudinary URL to render a specific page of a document as a high-res JPG/PNG image."""
        if not self.is_configured or not HAS_CLOUDINARY:
            return ""
        try:
            url, _ = cloudinary.utils.cloudinary_url(
                public_id,
                page=page,
                format="jpg",
                resource_type="image",
                transformation=[
                    {"width": width, "crop": "scale", "quality": "auto", "fetch_format": "auto"}
                ],
                sign_url=True,
                secure=True,
            )
            return url
        except Exception:
            return ""

    def get_document_preview_info(self, public_id: str, filename: Optional[str] = None) -> Dict[str, Any]:
        """
        Retrieves total page count and generated signed page image URLs for multi-page rendering.
        """
        if not self.is_configured or not HAS_CLOUDINARY or not public_id:
            return {"total_pages": 0, "page_urls": [], "signed_url": "", "private_download_url": ""}

        pids = [public_id]
        if not public_id.startswith("nexusrag_docs/"):
            pids.append(f"nexusrag_docs/{public_id}")
        else:
            pids.append(public_id.replace("nexusrag_docs/", "", 1))

        pages_count = 1
        found_pid = public_id

        for pid in pids:
            try:
                res = cloudinary.api.resource(pid, resource_type="image", pages=True)
                pages_count = res.get("pages", 1) or 1
                found_pid = pid
                break
            except Exception:
                try:
                    res = cloudinary.api.resource(pid, resource_type="raw")
                    found_pid = pid
                    break
                except Exception:
                    pass

        page_urls = []
        for p in range(1, pages_count + 1):
            p_url = self.get_page_image_url(found_pid, page=p, width=1400)
            if p_url:
                page_urls.append({"page": p, "image_url": p_url})

        signed_pdf_url = self.get_signed_url(found_pid, format="pdf", resource_type="image")
        private_dl_url = self.get_private_download_url(found_pid, format="pdf", resource_type="image")

        return {
            "public_id": found_pid,
            "total_pages": pages_count,
            "page_urls": page_urls,
            "signed_url": signed_pdf_url,
            "private_download_url": private_dl_url,
        }

    def get_file_bytes(
        self,
        public_id: Optional[str] = None,
        filename: Optional[str] = None,
        cloudinary_url: Optional[str] = None,
    ) -> Optional[bytes]:
        """
        Fetches document bytes securely from Cloudinary using authenticated credentials.
        """
        if not self.is_configured:
            return None

        urls_to_try = []

        if cloudinary_url:
            urls_to_try.append(cloudinary_url)

        # Generate candidates for public ID
        pids = []
        if public_id:
            pids.append(public_id)
            if not public_id.startswith("nexusrag_docs/"):
                pids.append(f"nexusrag_docs/{public_id}")
            else:
                pids.append(public_id.replace("nexusrag_docs/", "", 1))

        if HAS_CLOUDINARY:
            for pid in pids:
                for r_type in ["raw", "image", "auto"]:
                    try:
                        s_url, _ = cloudinary.utils.cloudinary_url(
                            pid,
                            resource_type=r_type,
                            sign_url=True,
                            secure=True,
                        )
                        if s_url and s_url not in urls_to_try:
                            urls_to_try.append(s_url)
                    except Exception:
                        pass

        # Prepare HTTP Basic Auth header using API Key and Secret
        auth_header = None
        if self.api_key and self.api_secret:
            import base64
            auth_str = f"{self.api_key}:{self.api_secret}"
            auth_b64 = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")
            auth_header = f"Basic {auth_b64}"

        import urllib.request
        for u in urls_to_try:
            try:
                headers = {"User-Agent": "Mozilla/5.0 (NexusRAG Server)"}
                if auth_header:
                    headers["Authorization"] = auth_header
                req = urllib.request.Request(u, headers=headers)
                with urllib.request.urlopen(req, timeout=12) as resp:
                    if resp.status == 200:
                        data = resp.read()
                        if len(data) > 0:
                            return data
            except Exception:
                try:
                    req_plain = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
                    with urllib.request.urlopen(req_plain, timeout=12) as resp:
                        if resp.status == 200:
                            data = resp.read()
                            if len(data) > 0:
                                return data
                except Exception:
                    pass

        return None

    def delete_file(
        self,
        public_id: str,
        resource_type: str = "raw",
        filename: Optional[str] = None,
    ) -> bool:
        """
        Deletes a file from Cloudinary given its public_id or filename.
        Thoroughly checks:
        1. Exact public_id under raw, image, and auto resource types.
        2. public_id with file extension (e.g. .pdf, .docx, .xlsx, .txt) under raw.
        3. public_id with extension stripped under image.
        4. With and without folder prefix ('nexusrag_docs/').
        5. Admin API delete_resources batch fallback.
        """
        if not self.is_configured or not HAS_CLOUDINARY or not public_id:
            return False

        # Gather potential candidate public IDs
        candidates = set()
        candidates.add(public_id)

        # Handle folder prefix
        if not public_id.startswith("nexusrag_docs/"):
            candidates.add(f"nexusrag_docs/{public_id}")
        else:
            candidates.add(public_id.replace("nexusrag_docs/", "", 1))

        # Handle extension variations
        ext = None
        if filename and "." in filename:
            ext = "." + filename.rsplit(".", 1)[1].lower()

        for pid in list(candidates):
            base, cur_ext = os.path.splitext(pid)
            if cur_ext:
                candidates.add(base)
            elif ext:
                candidates.add(pid + ext)
            # Also try common document extensions
            for common_ext in [".pdf", ".docx", ".xlsx", ".csv", ".txt", ".md", ".json"]:
                candidates.add(base + common_ext)

        deleted = False
        # Try uploader.destroy across all candidate public IDs and resource types
        for cand in candidates:
            for r_type in ["raw", "image", "auto"]:
                try:
                    res = cloudinary.uploader.destroy(cand, resource_type=r_type, invalidate=True)
                    if res.get("result") == "ok":
                        print(f"[CloudinaryService] 🗑️ Successfully deleted '{cand}' ({r_type}) from Cloudinary: {res}")
                        deleted = True
                        break
                except Exception:
                    pass
            if deleted:
                break

        # Admin API fallback
        if not deleted:
            for r_type in ["raw", "image"]:
                try:
                    res = cloudinary.api.delete_resources(list(candidates), resource_type=r_type, type="upload")
                    deleted_map = res.get("deleted", {})
                    if any(v == "deleted" for v in deleted_map.values()):
                        print(f"[CloudinaryService] 🗑️ Admin API deleted resources: {deleted_map}")
                        deleted = True
                        break
                except Exception:
                    pass

        return deleted


cloudinary_service = CloudinaryStorageService()

