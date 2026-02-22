# GitHub Releases ile Otomatik Güncelleme Kurulumu

Bu rehber, GorevYoneticisi uygulamasını GitHub üzerinden yayınlamak ve otomatik güncelleme sistemini aktif etmek için gereken tüm adımları anlatır.

---

## 1. GitHub'da Yeni Repo Oluştur

1. GitHub'a gir → sağ üstteki **+** butonuna tıkla → **New repository**
2. Ayarlar:
   - **Repository name**: istediğin bir isim yaz (örnek: `gorev-yoneticisi`)
   - **Public** veya **Private** fark etmez, ikisi de çalışır
   - README, .gitignore vs. ekleme (zaten projede var)
3. **Create repository** butonuna bas
4. Açılan sayfada HTTPS linkini kopyala (örnek: `https://github.com/senin-kullanici-adin/gorev-yoneticisi.git`)

---

## 2. package.json'daki Bilgileri Güncelle

`package.json` dosyasını aç ve şu kısmı bul:

```json
"publish": [
  {
    "provider": "github",
    "owner": "GITHUB_KULLANICI_ADIN",
    "repo": "GITHUB_REPO_ADIN"
  }
]
```

Bunu kendi bilgilerinle değiştir. Örnek:

```json
"publish": [
  {
    "provider": "github",
    "owner": "ahmet123",
    "repo": "gorev-yoneticisi"
  }
]
```

- **owner** = GitHub kullanıcı adın (URL'deki `github.com/BU_KISIM/...`)
- **repo** = Az önce oluşturduğun repo adı

---

## 3. GitHub Personal Access Token (PAT) Oluştur

Bu token, uygulamanın GitHub'a release yüklemesi için gerekli.

1. GitHub'a gir → sağ üstteki profil fotoğrafına tıkla → **Settings**
2. Sol menüde en alta in → **Developer settings**
3. **Personal access tokens** → **Tokens (classic)** → **Generate new token** → **Generate new token (classic)**
4. Ayarlar:
   - **Note**: `gorev-yoneticisi-release` (ne olduğunu hatırlamak için)
   - **Expiration**: istediğin süre (90 gün veya No expiration)
   - **Scopes**: sadece **`repo`** kutusunu işaretle (tüm alt kutular otomatik seçilir)
5. **Generate token** butonuna bas
6. **TOKENI HEMEN KOPYALA!** Sayfayı kapatınca bir daha göremezsin.

Token şuna benzer: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## 4. Token'ı Bilgisayarına Kaydet

PowerShell aç ve şu komutu çalıştır (token'ı yapıştır):

```powershell
[System.Environment]::SetEnvironmentVariable("GH_TOKEN", "ghp_BURAYA_TOKENINI_YAPISTIR", "User")
```

Bu komutu çalıştırdıktan sonra **PowerShell'i kapat ve yeniden aç**. Yoksa değişken aktif olmaz.

Doğru kaydedildiğini kontrol et:

```powershell
echo $env:GH_TOKEN
```

Token'ını görüyorsan tamam.

---

## 5. Projeyi GitHub'a Yükle (İlk Kez)

Proje klasöründe PowerShell aç ve sırayla şu komutları çalıştır:

```powershell
git init
git add .
git commit -m "ilk commit"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADIN/REPO_ADIN.git
git push -u origin main
```

`KULLANICI_ADIN` ve `REPO_ADIN` kısımlarını kendi bilgilerinle değiştir.

---

## 6. İlk Release'i Yayınla

Proje klasöründe şu komutu çalıştır:

```powershell
npx electron-vite build; npx electron-builder --win --publish always
```

Bu komut:
- Uygulamayı build eder
- Setup exe'sini oluşturur
- GitHub'da otomatik olarak `v1.0.0` release'i oluşturur
- Setup dosyasını release'e yükler

İşlem bitince GitHub repo sayfanda **Releases** bölümünde `v1.0.0` görürsün.

---

## 7. Güncelleme Nasıl Yayınlanır (Sonraki Sürümler)

Her güncelleme için 3 adım:

### Adım 1: Versiyon numarasını artır

`package.json`'da `version` alanını değiştir:

```json
"version": "1.0.1"
```

Versiyon numarası mantığı:
- `1.0.1` → küçük düzeltme (bug fix)
- `1.1.0` → yeni özellik
- `2.0.0` → büyük değişiklik

### Adım 2: Commit ve push

```powershell
git add .
git commit -m "v1.0.1 - açıklama yaz"
git push
```

### Adım 3: Release yayınla

```powershell
npx electron-vite build; npx electron-builder --win --publish always
```

Bu kadar. Uygulamayı kullanan herkes açtığında otomatik olarak güncellemeyi alır.

---

## Nasıl Çalışır?

1. Kullanıcı uygulamayı açar
2. Uygulama 3 saniye sonra arka planda GitHub Releases'ı kontrol eder
3. Yeni versiyon varsa uygulama içinde bildirim çıkar: "Güncelleme Mevcut: v1.0.1"
4. Güncelleme otomatik indirilir
5. İndirme bitince bildirim çıkar: "Güncelleme Hazır"
6. Kullanıcı uygulamayı kapattığında güncelleme otomatik kurulur
7. Bir sonraki açılışta yeni versiyon çalışır

---

## Sorun Giderme

### "GH_TOKEN" hatası alıyorum
- PowerShell'i kapatıp yeniden aç
- `echo $env:GH_TOKEN` ile token'ın kayıtlı olduğunu kontrol et

### Release oluşmuyor
- Token'ın `repo` scope'una sahip olduğundan emin ol
- package.json'daki `owner` ve `repo` değerlerinin doğru olduğunu kontrol et

### Güncelleme gelmiyor
- package.json'daki `version` numarasını artırdığından emin ol
- Eski versiyondan büyük bir numara olmalı (1.0.0 → 1.0.1)
- Uygulamayı kapatıp yeniden aç (kontrol açılışta yapılır)

### Private repo kullanıyorum
- Private repo'da da çalışır, token yeterli
- Ama kullanıcıların da token'a ihtiyacı olur. Public repo önerilir.
