// Backend integration point: replace with actual Supabase client initialization
export function createClient() {
  return {
    from: (_table: string) => ({
      select: (_cols: string) => ({
        eq: (_col: string, _val: unknown) => ({
          order: (_col: string) => ({
            order: (_col2: string) => ({
              then: (cb: (result: { data: unknown[] }) => void) => {
                // Mock users list
                cb({
                  data: [
                    { id: 'user-001', full_name: 'Carlos Mendoza', app_role: 'gerente', is_active: true },
                    { id: 'user-002', full_name: 'Ana Torres', app_role: 'cajero', is_active: true },
                    { id: 'user-003', full_name: 'Luis García', app_role: 'mesero', is_active: true },
                    { id: 'user-004', full_name: 'Sofía Ramírez', app_role: 'cocinero', is_active: true },
                    { id: 'user-005', full_name: 'Diego Hernández', app_role: 'mesero', is_active: true },
                  ],
                });
              },
            }),
          }),
        }),
      }),
    }),
  };
}