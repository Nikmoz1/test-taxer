import { Component } from '@angular/core';
import { NgxDropzoneChangeEvent } from 'ngx-dropzone';
import { Certificate } from "pkijs";
import { fromBER } from 'asn1js'
import { log } from 'console';
interface CertificateInfo {
  commonName?: string;
  startDate?: Date;
  expirationDate?: Date;
  issuerName?: string;
}

interface CertificateFile {
  name: string;
  data: Uint8Array;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  isAdd = false;
  file: File | undefined;
  files: CertificateFile[] = [];
  certificates: CertificateInfo[] = [];
  selectedCertificate: CertificateInfo = {};

  constructor() {
    this._getCertificates()
  }

  isEmptyObject(obj: CertificateInfo) {
    return Object.keys(obj).length === 0 && obj.constructor === Object;
  }

  addSertificate(event: NgxDropzoneChangeEvent) {
    const file = event.addedFiles[0];
    const reader = new FileReader();

    reader.onload = () => {
      const fileContent = reader.result as ArrayBuffer;
      const certificates = JSON.parse(localStorage.getItem('certificates') || '[]');
      const asn1 = fromBER(fileContent);
      const certificate = new Certificate({ schema: asn1.result });
      const fileName = certificate.subject.typesAndValues.find(attr => attr.type === "2.5.4.3")?.value.valueBlock.value;

      certificates.push({
        name: fileName,
        data: Array.from(new Uint8Array(fileContent))
      });
      const blob = new Blob([new Uint8Array(fileContent)], { type: 'application/octet-stream' });
      this._decodeASN1(blob);
      localStorage.setItem('certificates', JSON.stringify(certificates));
    };

    reader.readAsArrayBuffer(file);
    this.isAdd = !this.isAdd
  }

  switchButton() {
    this.isAdd = !this.isAdd
    console.log(this.isAdd);
    
    if(this.isAdd) {
      this.selectedCertificate = {}
    }
  }

  selectCertificate(certificate: CertificateInfo) {
    this.selectedCertificate = certificate;
  }

  _getCertificates() {
    if (typeof localStorage !== 'undefined') {
      this.files = JSON.parse(localStorage.getItem('certificates') || '[]');
      for (const file of this.files) {

        if (file !== null) {
          const blob = new Blob([new Uint8Array(file.data)], { type: 'application/octet-stream' });
          this._decodeASN1(blob);
        }
      }

    } else {
      this.files = [];
    }
  }

  _decodeASN1(blob: Blob) {
    const fileReader = new FileReader();

    fileReader.onload = () => {
      const arrayBuffer = fileReader.result as ArrayBuffer;
      const asn1 = fromBER(arrayBuffer);
      if (asn1.offset === -1) {
        return;
      }

      const certificate = new Certificate({ schema: asn1.result });
      const commonName = certificate.subject.typesAndValues.find(attr => attr.type === "2.5.4.3")?.value.valueBlock.value;
      const startDate = certificate.notBefore.value;
      const expirationDate = certificate.notAfter.value;

      console.log(certificate);

      const issuerName = certificate.issuer.typesAndValues.find(attr => attr.type === "2.5.4.3")?.value.valueBlock.value;

      this.certificates.push({
        commonName: commonName,
        expirationDate: expirationDate,
        issuerName: issuerName,
        startDate: startDate
      })

    };

    fileReader.readAsArrayBuffer(blob);
  }
}
