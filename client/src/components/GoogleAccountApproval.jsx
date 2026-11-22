import React, { useState } from 'react';
import api from '../services/api';

export default function GoogleAccountApproval() {
  const [accountId, setAccountId] = useState('');
  const [accountKind, setAccountKind] = useState('');
  const [linkRequest, setLinkRequest] = useState('');
  const [ownershipVerified, setOwnershipVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  const approve = async event => {
    event.preventDefault();
    if (submitting || !ownershipVerified) return;
    setSubmitting(true);
    setNotice(null);
    try {
      await api.post('/admin/google-account-links/approve', {
        accountId: accountId.trim(), accountKind, linkRequest: linkRequest.trim(), ownershipVerified
      });
      setAccountId('');
      setAccountKind('');
      setLinkRequest('');
      setOwnershipVerified(false);
      setNotice({ ok: true, message: 'সংযোগ অনুমোদিত হয়েছে। ব্যবহারকারী এখন Google দিয়ে সাইন-ইন করতে পারবেন।' });
    } catch (error) {
      setNotice({ ok: false, message: error.response?.data?.message || 'সংযোগ অনুমোদন করা যায়নি।' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="glass-card rounded-xl border border-slate-800 p-6 space-y-4">
      <h2 className="text-lg font-bold text-white">Google অ্যাকাউন্ট সংযোগ</h2>
      <p className="text-xs text-slate-400">
        একাডেমির আগের রেকর্ড ও প্রতিষ্ঠিত যোগাযোগের মাধ্যম ব্যবহার করে মালিকানা যাচাই করুন। Google ইমেইল ও সংযোগ কোড একা যথেষ্ট নয়।
      </p>
      <form onSubmit={approve} className="space-y-3 text-xs">
        <label className="block space-y-1">
          <span>যাচাইকৃত অ্যাকাউন্টের ধরন</span>
          <select
            value={accountKind}
            onChange={event => { setAccountKind(event.target.value); setOwnershipVerified(false); }}
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2"
          >
            <option value="">ধরন নির্বাচন করুন</option>
            <option value="student">শিক্ষার্থী</option>
            <option value="mentor">মেন্টর</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span>যাচাইকৃত শিক্ষার্থী বা মেন্টর আইডি</span>
          <input
            value={accountId}
            onChange={event => { setAccountId(event.target.value); setOwnershipVerified(false); }}
            required
            maxLength={128}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2"
          />
        </label>
        <label className="block space-y-1">
          <span>ব্যবহারকারীর সংযোগ কোড</span>
          <textarea
            value={linkRequest}
            onChange={event => { setLinkRequest(event.target.value); setOwnershipVerified(false); }}
            required
            maxLength={2048}
            rows={2}
            spellCheck={false}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 font-mono"
          />
        </label>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={ownershipVerified}
            onChange={event => setOwnershipVerified(event.target.checked)}
            required
          />
          <span>আমি Google থেকে প্রাপ্ত তথ্যের বাইরে অ্যাকাউন্টের মালিকানা যাচাই করেছি।</span>
        </label>
        <button
          type="submit"
          disabled={submitting || !ownershipVerified}
          className="rounded-lg bg-amber-500 px-4 py-2 font-bold text-slate-950 disabled:opacity-60"
        >
          {submitting ? 'অনুমোদন হচ্ছে…' : 'সংযোগ অনুমোদন করুন'}
        </button>
        {notice && <p role="status" className={notice.ok ? 'text-emerald-400' : 'text-rose-400'}>{notice.message}</p>}
      </form>
    </section>
  );
}
