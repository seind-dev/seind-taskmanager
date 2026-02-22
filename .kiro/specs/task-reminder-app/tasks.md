# Implementation Plan: Task Reminder App

## Overview

Electron + React + TypeScript tabanlı kişisel görev yönetimi uygulaması. Minimum RAM kullanımı hedeflenerek, JSON tabanlı yerel depolama, Zustand durum yönetimi ve Tailwind CSS ile geliştirilecektir.

## Tasks

- [x] 1. Proje yapısını ve temel yapılandırmayı oluştur
  - [x] 1.1 Electron + React + TypeScript proje iskeletini oluştur
    - Electron Forge veya electron-vite ile proje başlat
    - package.json, tsconfig.json, tailwind.config.js yapılandır
    - Ana süreç (main.ts), preload script (preload.ts) ve renderer giriş noktasını (renderer/index.tsx) oluştur
    - _Requirements: 6.1, 6.2, 6.4_
  - [x] 1.2 Veri modellerini ve tip tanımlarını oluştur
    - Task, Reminder, AppSettings, Priority, TaskStatus, CreateTaskDTO arayüzlerini tanımla
    - src/shared/types.ts dosyasında paylaşılan tipleri oluştur
    - _Requirements: 1.1, 2.1, 3.1_

- [x] 2. Veri depolama katmanını implement et
  - [x] 2.1 DataStore modülünü oluştur (electron-store wrapper)
    - electron-store paketini kur ve yapılandır
    - getTasks, getTask, addTask, updateTask, deleteTask metodlarını implement et
    - getSettings, updateSettings metodlarını implement et
    - UUID üretimi için crypto.randomUUID kullan
    - Görev oluşturmada başlık doğrulama (boş/boşluk reddi) ekle
    - Öncelik belirtilmediğinde varsayılan 'low' ataması yap
    - _Requirements: 1.2, 1.3, 1.5, 1.6, 2.2, 5.1, 5.2, 5.5_
  - [x]* 2.2 DataStore için property testleri yaz
    - **Property 1: Görev CRUD Gidiş-Dönüş**
    - **Validates: Requirements 1.2, 1.5, 1.6, 5.2, 5.3**
  - [x]* 2.3 DataStore için property testleri yaz (doğrulama)
    - **Property 2: Boş/Boşluk Başlık Reddi**
    - **Validates: Requirements 1.3**
  - [x]* 2.4 DataStore için property testleri yaz (varsayılan öncelik)
    - **Property 3: Varsayılan Öncelik Ataması**
    - **Validates: Requirements 2.2**
  - [x]* 2.5 Ayarlar round-trip property testi yaz
    - **Property 9: Ayarlar Gidiş-Dönüş**
    - **Validates: Requirements 7.4**

- [x] 3. Checkpoint - Veri katmanı testlerini doğrula
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Görev filtreleme ve gruplama mantığını implement et
  - [x] 4.1 Filtreleme ve gruplama fonksiyonlarını oluştur
    - Öncelik seviyesine göre filtreleme fonksiyonu yaz
    - Durum ve öncelik seviyesine göre gruplama fonksiyonu yaz
    - src/shared/taskUtils.ts dosyasında implement et
    - _Requirements: 2.4, 7.2_
  - [x]* 4.2 Filtreleme property testi yaz
    - **Property 4: Öncelik Filtreleme Doğruluğu**
    - **Validates: Requirements 2.4**
  - [x]* 4.3 Gruplama property testi yaz
    - **Property 8: Görev Gruplama Doğruluğu**
    - **Validates: Requirements 7.2**

- [x] 5. Hatırlatıcı sistemini implement et
  - [x] 5.1 ReminderManager modülünü oluştur
    - node-cron ile hatırlatıcı zamanlama mantığını implement et
    - scheduleReminder, cancelReminder, rescheduleAll metodlarını yaz
    - Sonraki tetikleme zamanı hesaplama fonksiyonunu implement et (günlük: +1 gün, haftalık: +7 gün)
    - _Requirements: 3.1, 3.4, 3.5, 3.6_
  - [x] 5.2 Bildirim oluşturma fonksiyonunu implement et
    - Electron native Notification API kullanarak bildirim gönder
    - Bildirim payload'una görev başlığı ve öncelik seviyesini ekle
    - _Requirements: 3.2, 3.3_
  - [x]* 5.3 Hatırlatıcı hesaplama property testi yaz
    - **Property 7: Tekrarlayan Hatırlatıcı Sonraki Tetikleme Hesaplaması**
    - **Validates: Requirements 3.6**
  - [x]* 5.4 Bildirim içeriği property testi yaz
    - **Property 5: Bildirim İçeriği Doğruluğu**
    - **Validates: Requirements 3.3**
  - [x]* 5.5 Hatırlatıcı iptali property testi yaz
    - **Property 6: Hatırlatıcı İptali**
    - **Validates: Requirements 3.5**

- [x] 6. Checkpoint - Hatırlatıcı testlerini doğrula
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. IPC köprüsünü ve preload script'i implement et
  - [x] 7.1 IPC handler'ları Ana_Süreç'te oluştur
    - ipcMain.handle ile tüm IPC kanallarını kaydet (task:getAll, task:add, task:update, task:delete, reminder:set, reminder:cancel, settings:get, settings:update, app:getAutoLaunch, app:setAutoLaunch)
    - DataStore ve ReminderManager'a bağla
    - _Requirements: 1.2, 1.5, 1.6, 3.5, 5.2_
  - [x] 7.2 Preload script ve contextBridge'i oluştur
    - contextBridge.exposeInMainWorld ile güvenli API'yi tanımla
    - Renderer tarafında kullanılacak tipli API arayüzünü oluştur
    - _Requirements: 6.4_

- [x] 8. React kullanıcı arayüzünü implement et
  - [x] 8.1 Zustand store'u oluştur
    - TaskStore'u implement et (tasks, filter, theme state'leri)
    - IPC üzerinden Ana_Süreç ile iletişim kuran action'ları yaz
    - _Requirements: 6.2_
  - [x] 8.2 Ana uygulama kabuğunu ve yönlendirmeyi oluştur
    - App.tsx ile React.lazy kullanarak tembel yükleme ayarla
    - Suspense fallback bileşeni ekle
    - Koyu/açık tema desteğini Tailwind dark mode ile implement et
    - _Requirements: 6.1, 7.1, 7.3_
  - [x] 8.3 Görev Listesi sayfasını implement et
    - @tanstack/react-virtual ile sanal kaydırma uygula
    - Öncelik seviyesine göre renk kodlama ekle (Yüksek: kırmızı, Orta: sarı, Düşük: yeşil)
    - Durum ve önceliğe göre görsel gruplama uygula
    - Öncelik filtresi UI bileşenini ekle
    - Sağ tıklama bağlam menüsü ekle (düzenle, sil, durum değiştir)
    - _Requirements: 2.3, 2.4, 6.5, 7.2, 7.5, 7.6_
  - [x] 8.4 Görev Formu sayfasını implement et
    - Başlık (zorunlu), açıklama, öncelik seçimi, hatırlatıcı ayarları formunu oluştur
    - Boş başlık doğrulama ve uyarı mesajı ekle
    - Oluşturma ve düzenleme modlarını destekle
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 3.1_
  - [x] 8.5 Ayarlar sayfasını implement et
    - Otomatik başlatma toggle'ı
    - Tema seçimi (koyu/açık)
    - Tema değişikliğini Yerel_Depo'ya kaydet
    - _Requirements: 4.2, 7.3, 7.4_

- [x] 9. Sistem tepsisi ve otomatik başlatma implement et
  - [x] 9.1 TrayManager'ı implement et
    - Sistem tepsisi ikonu ve menüsü oluştur
    - Pencereyi göster/gizle işlevselliğini ekle
    - Pencere kapatma yerine tepsiye küçültme davranışı ekle
    - _Requirements: 4.3_
  - [x] 9.2 AutoLaunchManager'ı implement et
    - Electron app.setLoginItemSettings ile Windows başlangıç kaydını yönet
    - enable, disable, isEnabled metodlarını implement et
    - _Requirements: 4.1, 4.2_

- [x] 10. Performans optimizasyonlarını uygula
  - [x] 10.1 Electron yapılandırma optimizasyonları
    - BrowserWindow webPreferences'da gereksiz özellikleri devre dışı bırak (nodeIntegration: false, spellcheck: false, enableWebSQL: false)
    - Arka planda renderer'ı askıya alma (backgroundThrottling: true)
    - V8 code cache'i etkinleştir
    - _Requirements: 6.3, 6.4_
  - [x] 10.2 Uygulama giriş noktasını birleştir ve son bağlantıları yap
    - main.ts'de tüm Ana_Süreç bileşenlerini (DataStore, ReminderManager, TrayManager, AutoLaunchManager, IPC handlers) başlat
    - Uygulama başlangıcında kaçırılan hatırlatıcıları kontrol et
    - startMinimized ayarına göre pencere davranışını ayarla
    - _Requirements: 4.1, 4.3, 5.3_

- [x] 11. Final checkpoint - Tüm testleri ve entegrasyonu doğrula
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- `*` ile işaretli görevler isteğe bağlıdır ve hızlı MVP için atlanabilir
- Her görev belirli gereksinimleri referans alır (izlenebilirlik)
- Checkpoint'ler artımlı doğrulama sağlar
- Property testleri evrensel doğruluk özelliklerini doğrular
- Birim testleri belirli örnekleri ve kenar durumları doğrular
- fast-check kütüphanesi property-based testler için kullanılacaktır
- Vitest test framework olarak kullanılacaktır
