# Gereksinimler Dokümanı

## Giriş

Bu doküman, Electron + React + TypeScript tabanlı kişisel görev yönetimi masaüstü uygulamasının gereksinimlerini tanımlar. Uygulama tek kullanıcılı olup backend gerektirmez, yerel veri depolama kullanır ve minimum RAM tüketimi ile çalışır. Windows başlangıcında otomatik açılarak kullanıcının görevlerini anında görüntüler.

## Sözlük

- **Uygulama**: Electron tabanlı kişisel görev yönetimi masaüstü uygulaması
- **Görev**: Kullanıcının takip etmek istediği bir yapılacak iş öğesi; başlık, açıklama, öncelik seviyesi, durum ve oluşturulma tarihi bilgilerini içerir
- **Öncelik_Seviyesi**: Bir görevin önem derecesi (Yüksek, Orta, Düşük)
- **Hatırlatıcı**: Belirli bir görev için yapılandırılabilir aralıklarla tetiklenen zamanlı bildirim
- **Bildirim**: Windows işletim sistemi üzerinden kullanıcıya gösterilen sistem bildirimi
- **Yerel_Depo**: Uygulama verilerinin saklandığı SQLite veya JSON tabanlı yerel dosya deposu
- **Görev_Listesi**: Tüm görevlerin görüntülendiği ana ekran bileşeni
- **Tamamlanma_Durumu**: Bir görevin mevcut durumu (Beklemede, Devam Ediyor, Tamamlandı)
- **Renderer_Süreci**: Electron uygulamasının kullanıcı arayüzünü çalıştıran süreç
- **Ana_Süreç**: Electron uygulamasının arka plan işlemlerini yöneten süreç

## Gereksinimler

### Gereksinim 1: Görev Oluşturma ve Yönetimi

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, görevlerimi oluşturmak, düzenlemek ve silmek istiyorum, böylece yapılacak işlerimi organize edebilirim.

#### Kabul Kriterleri

1. WHEN kullanıcı yeni bir görev eklemek istediğinde, THE Uygulama SHALL başlık alanı zorunlu olmak üzere bir görev oluşturma formu sunacaktır
2. WHEN kullanıcı geçerli bir başlık girip kaydet butonuna bastığında, THE Uygulama SHALL görevi Yerel_Depo'ya kaydedecek ve Görev_Listesi'ne ekleyecektir
3. WHEN kullanıcı boş bir başlık ile görev oluşturmaya çalıştığında, THE Uygulama SHALL oluşturmayı engelleyecek ve kullanıcıya uyarı mesajı gösterecektir
4. WHEN kullanıcı mevcut bir görevi düzenlemek istediğinde, THE Uygulama SHALL görevin tüm alanlarını düzenlenebilir şekilde gösterecektir
5. WHEN kullanıcı bir görevi silmek istediğinde, THE Uygulama SHALL silme işlemi öncesinde onay isteyecek ve onay alındığında görevi Yerel_Depo'dan kalıcı olarak kaldıracaktır
6. WHEN kullanıcı bir görevin durumunu değiştirdiğinde, THE Uygulama SHALL Tamamlanma_Durumu'nu güncelleyecek ve değişikliği Yerel_Depo'ya kaydedecektir

### Gereksinim 2: Öncelik Sistemi

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, görevlerime öncelik seviyesi atamak istiyorum, böylece önemli işlerimi kolayca ayırt edebilirim.

#### Kabul Kriterleri

1. WHEN kullanıcı bir görev oluştururken veya düzenlerken, THE Uygulama SHALL Yüksek, Orta ve Düşük olmak üzere üç Öncelik_Seviyesi seçeneği sunacaktır
2. WHEN kullanıcı bir Öncelik_Seviyesi seçmediğinde, THE Uygulama SHALL varsayılan olarak Düşük öncelik atayacaktır
3. WHEN Görev_Listesi görüntülendiğinde, THE Uygulama SHALL her görevin Öncelik_Seviyesi'ni görsel olarak farklı renk kodlarıyla ayırt edecektir
4. WHEN kullanıcı görevleri önceliğe göre filtrelemek istediğinde, THE Uygulama SHALL seçilen Öncelik_Seviyesi'ne göre Görev_Listesi'ni filtreleyecektir

### Gereksinim 3: Zamanlı Hatırlatıcılar

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, önemli görevlerim için yapılandırılabilir aralıklarla hatırlatıcılar ayarlamak istiyorum, böylece hiçbir görevi unutmam.

#### Kabul Kriterleri

1. WHEN kullanıcı bir görev için hatırlatıcı eklemek istediğinde, THE Uygulama SHALL tarih, saat ve tekrar aralığı (bir kez, günlük, haftalık) seçeneklerini sunacaktır
2. WHEN bir Hatırlatıcı'nın zamanı geldiğinde, THE Uygulama SHALL Windows işletim sistemi üzerinden bir Bildirim gösterecektir
3. WHEN bir Bildirim gösterildiğinde, THE Uygulama SHALL görev başlığını ve Öncelik_Seviyesi'ni bildirim içeriğinde görüntüleyecektir
4. WHILE Uygulama arka planda çalışırken, THE Ana_Süreç SHALL zamanlanmış Hatırlatıcı'ları kontrol etmeye devam edecektir
5. WHEN kullanıcı bir Hatırlatıcı'yı iptal etmek istediğinde, THE Uygulama SHALL hatırlatıcıyı devre dışı bırakacak ve Yerel_Depo'dan kaldıracaktır
6. WHEN tekrarlayan bir Hatırlatıcı tetiklendiğinde, THE Uygulama SHALL bir sonraki hatırlatma zamanını otomatik olarak hesaplayacak ve Yerel_Depo'ya kaydedecektir

### Gereksinim 4: Windows Başlangıcında Otomatik Açılma

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, bilgisayarımı açtığımda uygulamanın otomatik olarak başlamasını istiyorum, böylece görevlerimi hemen görebilirim.

#### Kabul Kriterleri

1. WHEN Windows işletim sistemi başlatıldığında, THE Uygulama SHALL otomatik olarak açılacak ve Görev_Listesi'ni görüntüleyecektir
2. WHEN kullanıcı otomatik başlatma özelliğini devre dışı bırakmak istediğinde, THE Uygulama SHALL ayarlar menüsünden bu özelliği kapatma seçeneği sunacaktır
3. WHEN Uygulama otomatik başlatıldığında, THE Uygulama SHALL sistem tepsisinde küçültülmüş olarak açılacak ve kullanıcı tıkladığında tam pencereyi gösterecektir

### Gereksinim 5: Yerel Veri Depolama

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, tüm verilerimin yerel olarak saklanmasını istiyorum, böylece internet bağlantısına ihtiyaç duymadan görevlerime erişebilirim.

#### Kabul Kriterleri

1. THE Uygulama SHALL tüm görev verilerini Yerel_Depo'da saklayacaktır
2. WHEN bir görev oluşturulduğunda, güncellendiğinde veya silindiğinde, THE Uygulama SHALL değişikliği Yerel_Depo'ya anında yazacaktır
3. WHEN Uygulama başlatıldığında, THE Uygulama SHALL Yerel_Depo'dan tüm görev verilerini yükleyecektir
4. IF Yerel_Depo dosyası bozulursa veya okunamazsa, THEN THE Uygulama SHALL kullanıcıya hata mesajı gösterecek ve boş bir Yerel_Depo ile başlayacaktır
5. WHEN görev verileri Yerel_Depo'ya yazılırken, THE Uygulama SHALL veri bütünlüğünü sağlamak için atomik yazma işlemi kullanacaktır

### Gereksinim 6: Düşük RAM Kullanımı ve Performans

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, uygulamanın minimum RAM tüketimi ile çalışmasını istiyorum, böylece bilgisayarımın performansını olumsuz etkilemez.

#### Kabul Kriterleri

1. WHILE Uygulama çalışırken, THE Renderer_Süreci SHALL bileşenleri tembel yükleme (lazy loading) ile yükleyecektir
2. THE Uygulama SHALL hafif durum yönetimi kullanacak ve ağır kütüphanelerden kaçınacaktır
3. WHILE Uygulama arka planda çalışırken, THE Renderer_Süreci SHALL minimum kaynak tüketecek şekilde askıya alınacaktır
4. THE Uygulama SHALL Electron süreç yükünü minimize etmek için gereksiz modülleri devre dışı bırakacaktır
5. WHEN Görev_Listesi büyük miktarda görev içerdiğinde, THE Uygulama SHALL sanal kaydırma (virtual scrolling) kullanarak yalnızca görünür öğeleri render edecektir

### Gereksinim 7: Kullanıcı Arayüzü Tasarımı

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, görsel olarak çekici ve kullanımı kolay bir arayüz istiyorum, böylece görevlerimi verimli şekilde yönetebilirim.

#### Kabul Kriterleri

1. THE Uygulama SHALL modern ve temiz bir tasarım dili kullanacaktır
2. WHEN kullanıcı Görev_Listesi'ni görüntülediğinde, THE Uygulama SHALL görevleri Tamamlanma_Durumu ve Öncelik_Seviyesi'ne göre görsel olarak gruplandıracaktır
3. THE Uygulama SHALL koyu (dark) ve açık (light) tema seçenekleri sunacaktır
4. WHEN kullanıcı tema değiştirdiğinde, THE Uygulama SHALL seçilen temayı Yerel_Depo'ya kaydedecek ve bir sonraki açılışta aynı temayı uygulayacaktır
5. THE Uygulama SHALL tüm etkileşimli öğelerde tutarlı animasyonlar ve geçiş efektleri kullanacaktır
6. WHEN kullanıcı bir görev üzerinde işlem yapmak istediğinde, THE Uygulama SHALL sağ tıklama bağlam menüsü ile hızlı erişim seçenekleri sunacaktır
