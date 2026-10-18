export interface AdminUser {
 id: string;
 name: string;
 email: string | null;
 providers: string[];
 createdAt: number;
 lastSaveAt: number | null;
 hasSave: boolean;
 roomCount: number;
}

export interface AdminUsers {
 users: AdminUser[];
 total: number;
 page: number;
 pageSize: number;
}

export interface AdminStats {
 generatedAt: number;
 totalUsers: number;
 newUsers24h: number;
 newUsers7d: number;
 newUsers30d: number;
 activeUsers24h: number;
 activeUsers7d: number;
 activeUsers30d: number;
 savedUsers: number;
 savedRooms: number;
 registrations: {date: string; count: number}[];
}
