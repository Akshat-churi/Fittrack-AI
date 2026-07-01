import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, LogOut, Mail, Save, Target, User, Award, Zap, Trophy, Flame, Layers, Activity, Lock, Image as ImageIcon, CheckCircle, XCircle, BarChart2, ExternalLink } from 'lucide-react';
import { getCurrentUser, signOut, updateCurrentUser } from '../utils/auth';
import { getUserPoints, getUnlockedBadges } from '../utils/storage';
import { getWorkoutHistory } from '../utils/storage';
import { BADGES } from '../utils/badgeTracker';
import { 
  syncProfile, 
  uploadProfilePhoto, 
  uploadCoverPhoto, 
  updateSupabaseProfile, 
  isUsernameAvailable,
  fetchPublicProfile 
} from '../utils/supabaseBridge';
import { useToast } from '../components/Toast';

const Profile = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [user, setUser] = useState(() => getCurrentUser());
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    age: '', 
    fitnessGoal: '', 
    bio: '', 
    photo: '', 
    coverPhoto: '',
    username: '' 
  });
  const [saved, setSaved] = useState(false);
  const [unlocked, setUnlocked] = useState([]);
  const [usernameStatus, setUsernameStatus] = useState({ checking: false, available: true, message: '' });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [dbStats, setDbStats] = useState({ followers: 0, following: 0, totalWorkouts: 0, caloriesBurned: 0, currentStreak: 0 });

  const BadgeIconMap = {
    Award: Award,
    Layers: Layers,
    Activity: Activity,
    Zap: Zap,
    Trophy: Trophy,
    Flame: Flame
  };

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const loadProfileDetails = async () => {
      // Load current local states
      const localDetails = {
        name: user.name || '',
        email: user.email || '',
        age: user.age || '',
        fitnessGoal: user.fitnessGoal || '',
        bio: user.bio || '',
        photo: user.photo || '',
        coverPhoto: user.coverPhoto || '',
        username: user.username || ''
      };

      // Also try to query Supabase to fetch Supabase-specific updates like cover_photo and username
      const dbProfile = await fetchPublicProfile(user.id, user.id);
      if (dbProfile) {
        localDetails.username = dbProfile.username || '';
        localDetails.coverPhoto = dbProfile.cover_photo || '';
        localDetails.photo = dbProfile.photo || user.photo || '';
        localDetails.bio = dbProfile.bio || user.bio || '';
        localDetails.fitnessGoal = dbProfile.fitness_goal || user.fitnessGoal || '';
        // Load social stats from Supabase
        setDbStats({
          followers: dbProfile.followersCount || 0,
          following: dbProfile.followingCount || 0,
          totalWorkouts: dbProfile.total_workouts || 0,
          caloriesBurned: dbProfile.calories_burned || 0,
          currentStreak: dbProfile.current_streak || 0,
        });
      }

      setForm(localDetails);
      setUnlocked(getUnlockedBadges());
    };

    loadProfileDetails();
  }, [navigate, user]);

  const handleChange = (event) => {
    setSaved(false);
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));

    // Trigger username check if username changes
    if (name === 'username') {
      checkUsername(value);
    }
  };

  const checkUsername = async (val) => {
    const cleanVal = val.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleanVal.length < 3) {
      setUsernameStatus({ checking: false, available: false, message: 'Too short (min 3 characters)' });
      return;
    }

    setUsernameStatus({ checking: true, available: true, message: '' });
    const available = await isUsernameAvailable(cleanVal, user.id);
    if (available) {
      setUsernameStatus({ checking: false, available: true, message: 'Username is available' });
    } else {
      setUsernameStatus({ checking: false, available: false, message: 'Username is taken' });
    }
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    const publicUrl = await uploadProfilePhoto(user.id, file);
    setUploadingPhoto(false);

    if (publicUrl) {
      setSaved(false);
      setForm((currentForm) => ({ ...currentForm, photo: publicUrl }));
      addToast('Profile photo uploaded!', 'success');
    } else {
      addToast('Failed to upload profile photo.', 'error');
    }
  };

  const handleCoverUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    const publicUrl = await uploadCoverPhoto(user.id, file);
    setUploadingCover(false);

    if (publicUrl) {
      setSaved(false);
      setForm((currentForm) => ({ ...currentForm, coverPhoto: publicUrl }));
      addToast('Cover photo uploaded!', 'success');
    } else {
      addToast('Failed to upload cover photo.', 'error');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    // Ensure clean username format
    const cleanUsername = form.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleanUsername.length < 3) {
      addToast('Username must be at least 3 characters.', 'warning');
      return;
    }

    // Double check availability
    const available = await isUsernameAvailable(cleanUsername, user.id);
    if (!available) {
      addToast('Username is already taken.', 'error');
      return;
    }

    const payload = {
      ...form,
      username: cleanUsername
    };

    // Update Local auth user profile
    const updatedUser = updateCurrentUser(payload);
    setUser(updatedUser);

    // Sync to Supabase
    const dbSuccess = await updateSupabaseProfile(user.id, {
      username: cleanUsername,
      display_name: form.name,
      photo: form.photo,
      cover_photo: form.coverPhoto,
      bio: form.bio,
      fitness_goal: form.fitnessGoal,
    });

    if (dbSuccess) {
      await syncProfile(updatedUser);
      setSaved(true);
      addToast('Profile updated successfully!', 'success');
    } else {
      addToast('Failed to sync changes with Supabase.', 'error');
    }
  };

  const handleSignOut = () => {
    signOut();
    navigate('/auth');
  };

  if (!user) return null;

  return (
    <main className="page pb-24 md:pb-8">
      <div className="content-width space-y-6">
        
        {/* Cover Photo */}
        <div className="h-40 sm:h-52 w-full bg-gradient-to-r from-brand-orange/20 via-zinc-900 to-accent-blue/10 relative border border-zinc-800/60 rounded-3xl overflow-hidden group">
          {form.coverPhoto
            ? <img src={form.coverPhoto} alt="Cover" className="w-full h-full object-cover"/>
            : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-10 h-10 text-zinc-800"/></div>}
          <label className="absolute right-4 bottom-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-black/60 border border-zinc-700/60 text-white text-xs font-bold cursor-pointer hover:bg-black/80 transition-all">
            <Camera className="w-4 h-4 text-brand-orange"/>
            {uploadingCover ? 'Uploading…' : 'Change Cover'}
            <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" disabled={uploadingCover}/>
          </label>
        </div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-6">
          <aside className="glass rounded-3xl p-6 h-fit text-center border border-zinc-800/60">
            {/* Avatar Photo Selector */}
            <div className="relative w-32 h-32 mx-auto mb-5">
              <div className="w-32 h-32 rounded-2xl overflow-hidden bg-brand-dark border border-brand-orange/20 flex items-center justify-center">
                {form.photo ? (
                  <img src={form.photo} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-14 h-14 text-slate-600" />
                )}
              </div>
              <label className="absolute -right-2 -bottom-2 w-11 h-11 rounded-xl bg-brand-orange text-white flex items-center justify-center cursor-pointer shadow-lg hover:bg-[#ff8f4d] transition-all">
                <Camera className="w-5 h-5" />
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
              </label>
            </div>

            <h1 className="text-2xl font-bold text-white tracking-tight">{form.name || 'Your Profile'}</h1>
            <p className="text-xs text-slate-500 font-semibold mt-1">@{form.username || 'username'}</p>
            <p className="text-sm text-slate-400 mt-2">{form.email}</p>

            {/* Enhanced stats grid */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <div className="rounded-xl bg-brand-dark/80 border border-brand-border p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Points</p>
                <p className="text-xl font-black text-brand-orange mt-1">{getUserPoints().toLocaleString()}</p>
              </div>
              <div className="rounded-xl bg-brand-dark/80 border border-brand-border p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Streak</p>
                <p className="text-xl font-black text-red-400 mt-1 flex items-center justify-center gap-1">
                  <Flame className="w-4 h-4" />{dbStats.currentStreak || getWorkoutHistory().length > 0 ? (dbStats.currentStreak) : 0}d
                </p>
              </div>
              <div className="rounded-xl bg-brand-dark/80 border border-brand-border p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Workouts</p>
                <p className="text-xl font-black text-indigo-400 mt-1">{dbStats.totalWorkouts || getWorkoutHistory().length}</p>
              </div>
              <div className="rounded-xl bg-brand-dark/80 border border-brand-border p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Calories</p>
                <p className="text-xl font-black text-emerald-400 mt-1">{Math.round(dbStats.caloriesBurned || 0)}</p>
              </div>
            </div>

            {/* Follow counts */}
            <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-brand-border/40">
              <div className="text-center">
                <p className="text-lg font-black text-white">{dbStats.followers}</p>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Followers</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-white">{dbStats.following}</p>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Following</p>
              </div>
            </div>

            {/* View public profile link */}
            <Link
              to={`/user/${user.id}`}
              className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-brand-orange hover:text-[#ff8f4d] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> View Public Profile
            </Link>

            <button type="button" onClick={handleSignOut} className="w-full mt-5 flex items-center justify-center gap-2 rounded-xl border border-brand-border bg-brand-dark px-4 py-3 text-sm font-bold text-slate-300 hover:text-white hover:bg-brand-border transition-all">
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </aside>

          <section className="glass rounded-3xl p-6 md:p-8 border border-zinc-800/60">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white tracking-tight">Basic details</h2>
              <p className="text-sm text-slate-400 mt-2">Keep your profile updated for a more personal workout experience.</p>
            </div>

            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-5">
              {/* Full Name */}
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Full name</span>
                <div className="mt-2 flex items-center gap-3 rounded-xl border border-brand-border bg-brand-dark px-3">
                  <User className="w-4 h-4 text-slate-500" />
                  <input name="name" value={form.name} onChange={handleChange} required className="w-full bg-transparent py-3 text-sm text-white focus:outline-none" />
                </div>
              </label>

              {/* Username Field */}
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Username</span>
                <div className="mt-2 flex items-center gap-3 rounded-xl border border-brand-border bg-brand-dark px-3 relative">
                  <input 
                    name="username" 
                    value={form.username} 
                    onChange={handleChange} 
                    required 
                    placeholder="fit_athlete"
                    className="w-full bg-transparent py-3 text-sm text-white focus:outline-none pr-10" 
                  />
                  <div className="absolute right-3">
                    {usernameStatus.checking ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-brand-orange"></div>
                    ) : form.username && (
                      usernameStatus.available ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )
                    )}
                  </div>
                </div>
                {form.username && (
                  <p className={`text-[10px] mt-1 font-bold ${usernameStatus.available ? 'text-emerald-400' : 'text-red-400'}`}>
                    {usernameStatus.message}
                  </p>
                )}
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Email</span>
                <div className="mt-2 flex items-center gap-3 rounded-xl border border-brand-border bg-brand-dark px-3 opacity-80">
                  <Mail className="w-4 h-4 text-slate-500" />
                  <input name="email" value={form.email} readOnly className="w-full bg-transparent py-3 text-sm text-slate-400 focus:outline-none" />
                </div>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Age</span>
                <input type="number" name="age" min="1" value={form.age} onChange={handleChange} className="mt-2 w-full rounded-xl border border-brand-border bg-brand-dark px-4 py-3 text-sm text-white focus:outline-none" placeholder="18" />
              </label>

              <label className="block md:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Fitness goal</span>
                <div className="mt-2 flex items-center gap-3 rounded-xl border border-brand-border bg-brand-dark px-3">
                  <Target className="w-4 h-4 text-slate-500" />
                  <input name="fitnessGoal" value={form.fitnessGoal} onChange={handleChange} className="w-full bg-transparent py-3 text-sm text-white focus:outline-none" placeholder="Improve push-up form" />
                </div>
              </label>

              <label className="block md:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Bio</span>
                <textarea name="bio" rows="5" value={form.bio} onChange={handleChange} className="mt-2 w-full rounded-xl border border-brand-border bg-brand-dark px-4 py-3 text-sm text-white resize-none focus:outline-none" placeholder="Add your training notes, goals, or anything you want to remember." />
              </label>

              <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-2">
                <Link to="/history" className="text-sm font-semibold text-brand-orange hover:text-[#ff8f4d]">View workout history</Link>
                <div className="flex items-center gap-3">
                  {saved && <span className="text-sm font-semibold text-emerald-400">Profile saved</span>}
                  <button type="submit" className="flex items-center justify-center gap-2 rounded-xl bg-brand-orange px-5 py-3 text-sm font-bold text-white hover:bg-[#ff8f4d] transition-all active:scale-95 shadow-md">
                    <Save className="w-4 h-4" />
                    Save profile
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>

        {/* Achievements Gallery Section */}
        <section className="glass rounded-3xl p-6 md:p-8 border border-zinc-800/60">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Trophy className="w-6 h-6 text-brand-orange" /> Achievements & Badges
            </h2>
            <p className="text-sm text-slate-400 mt-2">Unlock unique badges by completing workouts, building streaks, and earning points.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {BADGES.map(badge => {
              const unlockedInfo = unlocked.find(u => u.id === badge.id);
              const isUnlocked = !!unlockedInfo;
              const Icon = BadgeIconMap[badge.icon] || Award;
              
              return (
                <div 
                  key={badge.id}
                  className={`border rounded-2xl p-4 flex gap-4 items-start transition-all relative overflow-hidden group ${
                    isUnlocked 
                      ? `${badge.color} border-brand-orange/20` 
                      : 'border-brand-border/40 bg-brand-dark/20 opacity-40'
                  }`}
                >
                  <div className={`p-3 rounded-xl border shrink-0 relative ${
                    isUnlocked 
                      ? 'border-brand-orange/20 bg-brand-orange/10 text-brand-orange shadow-[0_0_15px_rgba(255,126,51,0.08)]' 
                      : 'border-brand-border bg-brand-surface text-slate-600'
                  }`}>
                    {isUnlocked ? <Icon className="w-6 h-6 animate-pulse" /> : <Lock className="w-6 h-6" />}
                  </div>
                  
                  <div className="space-y-1 z-10">
                    <h4 className={`text-sm font-bold tracking-tight ${isUnlocked ? 'text-white font-extrabold' : 'text-slate-500'}`}>
                      {badge.name}
                    </h4>
                    <p className="text-[10px] font-semibold text-slate-400 leading-relaxed">
                      {badge.description}
                    </p>
                    {isUnlocked && (
                      <span className="text-[8px] font-bold text-brand-orange/60 uppercase tracking-widest block pt-1">
                        Unlocked {new Date(unlockedInfo.unlockedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
};

export default Profile;