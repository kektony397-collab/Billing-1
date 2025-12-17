import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { db } from '../db';
import { CompanyProfile, AppTheme, InvoiceTemplate } from '../types';
import { Save, Building2, Palette, LayoutTemplate, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';

export const Settings: React.FC = () => {
  const { register, handleSubmit, setValue, watch } = useForm<CompanyProfile>();
  const currentTheme = watch('theme');

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await db.settings.get(1); 
      if (settings) {
        Object.keys(settings).forEach((key) => {
          setValue(key as keyof CompanyProfile, (settings as any)[key]);
        });
      }
    };
    loadSettings();
  }, [setValue]);

  const onSubmit = async (data: CompanyProfile) => {
    try {
      await db.settings.put({ ...data, id: 1 });
      toast.success('Settings Updated Successfully');
      setTimeout(() => window.location.reload(), 800); 
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const ThemeOption = ({ value, color, label }: { value: AppTheme, color: string, label: string }) => (
    <label className={`cursor-pointer flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${currentTheme === value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
      <input type="radio" {...register('theme')} value={value} className="hidden" />
      <div className={`w-12 h-12 rounded-full mb-2 ${color} shadow-lg`}></div>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </label>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center space-x-4">
        <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white shadow-lg">
          <SettingsIcon className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Settings</h2>
          <p className="text-slate-500">Configure your application preferences</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
           <div className="flex items-center gap-2 mb-6"><Palette className="w-5 h-5" /><h3 className="text-xl font-bold">App Appearance</h3></div>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ThemeOption value="blue" color="bg-blue-600" label="Ocean Blue" />
              <ThemeOption value="green" color="bg-emerald-600" label="Nature Green" />
              <ThemeOption value="purple" color="bg-purple-600" label="Royal Purple" />
              <ThemeOption value="dark" color="bg-gray-900" label="Midnight Dark" />
           </div>
        </section>

        <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
           <div className="flex items-center gap-2 mb-6"><LayoutTemplate className="w-5 h-5" /><h3 className="text-xl font-bold">Invoice Design</h3></div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {['standard', 'modern', 'thermal', 'authentic'].map(t => (
                <label key={t} className="cursor-pointer border-2 border-slate-200 rounded-xl p-4 hover:border-blue-400 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 transition-all">
                  <input type="radio" {...register('invoiceTemplate')} value={t} className="hidden" />
                  <div className="font-bold mb-1 capitalize">{t}</div>
                  <div className="text-xs text-slate-500 capitalize">{t === 'authentic' ? 'Exact replica of your image' : `Basic ${t} style`}</div>
                </label>
              ))}
           </div>
        </section>

        <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-6"><Building2 className="w-5 h-5" /><h3 className="text-xl font-bold">Company Details</h3></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2"><label className="block text-sm font-semibold mb-1">Company Name</label><input {...register('companyName', { required: true })} className="w-full rounded-xl border px-4 py-3" /></div>
            <div><label className="block text-sm font-medium mb-1">GSTIN</label><input {...register('gstin')} className="w-full rounded-xl border px-4 py-3" /></div>
            <div><label className="block text-sm font-medium mb-1">Phone</label><input {...register('phone')} className="w-full rounded-xl border px-4 py-3" /></div>
            <div><label className="block text-sm font-medium mb-1">DL No. 1</label><input {...register('dlNo1')} className="w-full rounded-xl border px-4 py-3" /></div>
            <div><label className="block text-sm font-medium mb-1">DL No. 2</label><input {...register('dlNo2')} className="w-full rounded-xl border px-4 py-3" /></div>
             <div className="col-span-1 md:col-span-2"><label className="block text-sm font-medium mb-1">Address 1</label><input {...register('addressLine1')} className="w-full rounded-xl border px-4 py-3" /></div>
            <div className="col-span-1 md:col-span-2"><label className="block text-sm font-medium mb-1">Address 2</label><input {...register('addressLine2')} className="w-full rounded-xl border px-4 py-3" /></div>
            <div className="col-span-1 md:col-span-2"><label className="block text-sm font-medium mb-1">Invoice Terms</label><textarea {...register('terms')} rows={3} className="w-full rounded-xl border px-4 py-3" /></div>
          </div>
        </section>

        <div className="flex justify-end"><button type="submit" className="flex items-center px-8 py-4 bg-blue-600 text-white font-bold rounded-full shadow-lg hover:scale-105 transition-all"><Save className="w-5 h-5 mr-2" /> Save Settings</button></div>
      </form>
    </div>
  );
};