import sys
import os
import json
import tempfile
from pathlib import Path
from typing import Dict, List, Any

# pdf-diff modülünü import et (git submodule'den veya kurulu kütüphaneden)
try:
    from pdf_diff.command_line import compute_changes
except ImportError:
    # Eğer git submodule olarak varsa
    sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'diff1'))
    from pdf_diff.command_line import compute_changes


class PDFProcessor:
    """pdf-diff library kullanarak PDF karşılaştırması yapar"""

    def compare_pdfs(self, file1_path: str, file2_path: str) -> Dict[str, Any]:
        """
        İki PDF'i karşılaştırır ve difference data'yı döner

        Args:
            file1_path: İlk PDF'in dosya yolu
            file2_path: İkinci PDF'in dosya yolu

        Returns:
            dict: {
                'pages_affected': int,
                'total_differences': int,
                'differences_by_page': {
                    page_number: {
                        'additions': [],
                        'deletions': [],
                        'modifications': []
                    }
                }
            }
        """
        try:
            # pdf-diff compute_changes fonksiyonunu çağır
            changes = compute_changes(
                file1_path,
                file2_path,
                top_margin=0,      # Üst margin yok
                bottom_margin=100  # Alt margin yok (tüm sayfa)
            )

            # Changes'i frontend için uygun formata dönüştür
            differences_by_page = {}
            pages_affected = set()
            total_differences = 0

            for change in changes:
                if change == "*":  # Marker'ları atla
                    continue

                # PDF index'e göre type belirle (0=original/removed, 1=modified/added)
                pdf_index = change['pdf']['index']
                change_type = 'removed' if pdf_index == 0 else 'added'

                page_number = change['page']['number']
                pages_affected.add(page_number)

                # Sayfa için dict yoksa oluştur
                if page_number not in differences_by_page:
                    differences_by_page[page_number] = {
                        'additions': [],
                        'deletions': [],
                        'modifications': []
                    }

                # Difference objesi oluştur
                diff_obj = {
                    'id': f"diff_{page_number}_{total_differences}",
                    'type': change_type,
                    'location': {
                        'x': change['x'],
                        'y': change['y'],
                        'width': change['width'],
                        'height': change['height']
                    },
                    'text': change.get('text', '').strip(),
                    'confidence': 100  # pdf-diff kesin sonuç verir
                }

                # Tipine göre ekle
                if change_type == 'added':
                    differences_by_page[page_number]['additions'].append(diff_obj)
                else:
                    differences_by_page[page_number]['deletions'].append(diff_obj)

                total_differences += 1

            return {
                'pages_affected': len(pages_affected),
                'total_differences': total_differences,
                'differences_by_page': differences_by_page,
                'generated_at': None  # Backend timestamp ekleyecek
            }

        except Exception as e:
            raise Exception(f"PDF comparison failed: {str(e)}")


# Global instance
pdf_processor = PDFProcessor()
