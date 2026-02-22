// Öncelik seviyeleri: Yüksek, Orta, Düşük
export type Priority = 'high' | 'medium' | 'low';

// Görev durumları: Beklemede, Devam Ediyor, Tamamlandı
export type TaskStatus = 'pending' | 'in_progress' | 'completed';

// Hatırlatıcı tekrar aralığı: Bir kez, Günlük, Haftalık
export type RepeatInterval = 'once' | 'daily' | 'weekly';

// Görev kapsamı: Kişisel (lokal) veya Paylaşılan (Supabase)
export type TaskScope = 'personal' | 'shared';

// Tema seçenekleri
export type Theme = 'dark' | 'light';

// Öncelik filtresi (tümü dahil)
export type PriorityFilter = 'all' | Priority;

// Alt görev arayüzü
export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

// Hatırlatıcı arayüzü
export interface Reminder {
  dateTime: string;              // ISO 8601 tarih-saat
  repeat: RepeatInterval;        // 'once' | 'daily' | 'weekly'
  enabled: boolean;
  nextTrigger: string;           // Bir sonraki tetiklenme zamanı (ISO 8601)
}

// Görev arayüzü
export interface Task {
  id: string;                    // UUID
  title: string;                 // Zorunlu, boş olamaz
  description?: string;          // İsteğe bağlı açıklama (Markdown destekli)
  priority: Priority;            // 'high' | 'medium' | 'low'
  status: TaskStatus;            // 'pending' | 'in_progress' | 'completed'
  scope: TaskScope;              // 'personal' | 'shared'
  reminder?: Reminder;           // İsteğe bağlı hatırlatıcı
  subtasks?: SubTask[];          // Alt görevler
  tags?: string[];               // Etiketler / kategoriler
  order?: number;                // Sıralama (drag & drop)
  dueDate?: string;              // Son tarih (ISO 8601)
  groupId?: string;              // Grup ID (grup görevi ise)
  createdAt: string;             // ISO 8601 tarih
  updatedAt: string;             // ISO 8601 tarih
}

// Uygulama ayarları
export interface AppSettings {
  autoLaunch: boolean;           // Windows başlangıcında otomatik açılma
  theme: Theme;                  // 'dark' | 'light'
  startMinimized: boolean;       // Sistem tepsisinde küçültülmüş başla
}

// Görev oluşturma DTO'su
export interface CreateTaskDTO {
  title: string;
  description?: string;
  priority?: Priority;           // Varsayılan: 'low'
  scope?: TaskScope;             // Varsayılan: 'personal'
  reminder?: Omit<Reminder, 'nextTrigger' | 'enabled'>;
  subtasks?: SubTask[];
  tags?: string[];
  dueDate?: string;
  groupId?: string;
}

// Auth result
export interface AuthResult {
  success: boolean;
  error?: string;
  userId?: string;
  email?: string;
}

// Group
export interface Group {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

// Group member
export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  email?: string;
  discordName?: string;
  avatarUrl?: string;
  role: 'owner' | 'member';
  joinedAt: string;
}
