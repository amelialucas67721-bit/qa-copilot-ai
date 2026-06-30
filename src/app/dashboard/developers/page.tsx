'use client';

import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Mail, Plus, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Developer = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

export default function DevelopersPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['developers'],
    queryFn: async () => {
      const res = await fetch('/api/developers');
      if (!res.ok) throw new Error('Failed to load developers');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/developers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to add developer');
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Developer added');
      setForm({ name: '', email: '', password: '' });
      queryClient.invalidateQueries({ queryKey: ['developers'] });
      queryClient.invalidateQueries({ queryKey: ['defects'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to add developer');
    },
  });

  const developers: Developer[] = data?.developers || [];

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Add Developers</h1>
        <p className="text-sm text-gray-500 mt-1">
          Create developer accounts so defects can be assigned and filtered by developer.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <form
          onSubmit={onSubmit}
          className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"
        >
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
              <UserRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">New developer</h2>
              <p className="text-xs text-gray-500">They can sign in with these credentials.</p>
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-gray-500 block mb-1">Name</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
              placeholder="Developer name"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-500 block mb-1">Email</span>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
              placeholder="developer@company.com"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-500 block mb-1">Password</span>
            <input
              required
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
              placeholder="Minimum 8 characters"
            />
          </label>

          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {createMutation.isPending ? 'Adding...' : 'Add Developer'}
          </Button>
        </form>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Developers</h2>
            <p className="text-xs text-gray-500 mt-1">{developers.length} developers available</p>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-sm text-gray-500">Loading developers...</div>
          ) : developers.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <UserRound className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900">No developers yet</p>
              <p className="text-sm text-gray-500 mt-1">Add a developer to assign defects.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {developers.map((developer) => (
                <div key={developer.id} className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-semibold">
                      {(developer.name || developer.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{developer.name}</p>
                      <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {developer.email}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">
                    Developer
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
