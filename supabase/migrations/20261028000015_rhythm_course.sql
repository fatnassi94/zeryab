-- Course «الإيقاعات العربية» (rhythms): rows for access and progress.
-- Lessons and drills are written in code (src/lib/courses/rhythms.ts, same slugs);
-- the final test is stored here so it is graded on the server. In a prompt,
-- [[iqa:id]] shows a cycle and [[listen:id]] plays one unseen.
-- Safe to run twice: rows are updated, the test is created only once.

insert into public.courses (slug, title, summary, description, level, visibility, status, position)
values (
  'rhythms',
  'الإيقاعات العربية',
  'دُم وتَك: اقرأ الدورات الإيقاعية واسمعها وانقرها في وقتها. ثمانية دروس، ثمانية تمارين، واختبار نهائي.',
  'الوحدة، المقسوم، البلدي، الصعيدي، الملفوف والسماعي الثقيل، مع تمارين نقر تُقاس فيها دقّة إيقاعك. الإيقاعات التونسية تُضاف بإشراف مدرّسي النادي.',
  'beginner', 'public', 'published', 1
)
on conflict (slug) do update
  set title = excluded.title, summary = excluded.summary, description = excluded.description,
      level = excluded.level, visibility = excluded.visibility, status = excluded.status, position = excluded.position;

insert into public.lessons (course_id, slug, title, summary, level, position, status)
select c.id, v.slug, v.title, v.summary, 'beginner', v.position, 'published'
from public.courses c,
  (values
    ('what-is-iqa', 'ما هو الإيقاع؟', 'الدورة الإيقاعية، والضربات الثلاث: دُم وتَك وكا.', 1),
    ('reading-cycles', 'قراءة الدورة الإيقاعية', 'النبضات، والعدّ «١ و ٢ و»، وكيف نقرأ الشبكة.', 2),
    ('wahda', 'الوحدة', 'أبسط الإيقاعات: دُم واحدة وتَكّان.', 3),
    ('maqsum', 'المقسوم', 'الإيقاع الأكثر انتشارًا في الأغنية العربية.', 4),
    ('baladi-saidi', 'البلدي والصعيدي', 'أخوان للمقسوم: نفس الطول، دُمّات في أماكن أخرى.', 5),
    ('malfuf', 'الملفوف', 'إيقاع سريع في ٢/٤ مقسوم ٣ + ٣ + ٢.', 6),
    ('samai-thaqil', 'السماعي الثقيل', 'دورة من عشر نبضات (١٠/٨) للسماعيات والموشّحات.', 7),
    ('rhythm-with-melody', 'الإيقاع مع اللحن', 'اللحن فوق والإيقاع تحت: اسمعهما معًا واقرأ النوتة.', 8),
    ('drill-strokes', 'تمرين ١: اسمع الضربة', 'دُم أم تَك أم كا؟', 9),
    ('drill-pulses', 'تمرين ٢: عُدّ النبضات', 'كم نبضة في الدورة؟ وأين الضربة؟', 10),
    ('drill-complete', 'تمرين ٣: أكمل الدورة', 'ما الضربة الناقصة؟', 11),
    ('drill-name-written', 'تمرين ٤: سمِّ الإيقاع المكتوب', 'اقرأ الشبكة واعرف الإيقاع.', 12),
    ('drill-name-heard', 'تمرين ٥: سمِّ الإيقاع بالأذن', 'استمع واعرف الإيقاع.', 13),
    ('drill-tap-wahda', 'تمرين ٦: انقر الوحدة', 'اعزف الوحدة في وقتها.', 14),
    ('drill-tap-maqsum', 'تمرين ٧: انقر المقسوم', 'اعزف المقسوم في وقته.', 15),
    ('drill-tap-baladi', 'تمرين ٨: انقر البلدي', 'اعزف البلدي في وقته.', 16),
    ('final-test', 'الاختبار النهائي', 'اثنا عشر سؤالًا. النجاح من ٧٠٪ فما فوق.', 17)
  ) as v(slug, title, summary, position)
where c.slug = 'rhythms'
on conflict (course_id, slug) do update
  set title = excluded.title, summary = excluded.summary, position = excluded.position, status = excluded.status;

do $$
declare
  v_lesson uuid;
  v_exercise uuid;
  v_question uuid;
  q record;
begin
  select l.id into v_lesson
  from public.lessons l join public.courses c on c.id = l.course_id
  where c.slug = 'rhythms' and l.slug = 'final-test';

  if exists (select 1 from public.exercises where lesson_id = v_lesson) then
    return;
  end if;

  insert into public.exercises (lesson_id, kind, title, instructions, position, status)
  values (v_lesson, 'rhythm_identification', 'الاختبار النهائي: الإيقاعات', 'أجب عن الأسئلة الاثني عشر. النجاح من ٩ إجابات صحيحة.', 1, 'published')
  returning id into v_exercise;

  for q in
    select * from (values
      (1, 'ما الضربة الغليظة التي تُضرب في وسط الجلد؟', '["تَك","كا","دُم","صمت"]', 2, 'الدُم غليظة في الوسط، والتَك حادّة على الحافة.'),
      (2, 'ماذا تعني النقطة (.) في شبكة الإيقاع؟', '["ضربة قويّة","صمت مدّته نبضة","ضربة خفيفة","نهاية الدورة"]', 1, 'النقطة صمت مدّته نبضة، كالسكتة في النوتة.'),
      (3, 'ما اسم هذا الإيقاع؟ [[iqa:maqsum]]', '["البلدي","المقسوم","الصعيدي","الوحدة"]', 1, 'دُم تَك – تَك دُم – تَك –: المقسوم.'),
      (4, 'ما اسم هذا الإيقاع؟ [[iqa:baladi]]', '["البلدي","المقسوم","السماعي الثقيل","الصعيدي"]', 0, 'دُمّان في البداية: البلدي.'),
      (5, 'ما اسم هذا الإيقاع؟ [[iqa:saidi]]', '["الوحدة","المقسوم","الصعيدي","البلدي"]', 2, 'دُمّان في الوسط: الصعيدي.'),
      (6, 'استمع: ما اسم هذا الإيقاع؟ [[listen:wahda]]', '["الوحدة","المقسوم","البلدي","السماعي الثقيل"]', 0, 'دُم واحدة وتَكّان: الوحدة.'),
      (7, 'استمع: ما اسم هذا الإيقاع؟ [[listen:samai-thaqil]]', '["الصعيدي","الوحدة","السماعي الثقيل","المقسوم"]', 2, 'دورة طويلة من عشر نبضات: السماعي الثقيل.'),
      (8, 'كم نبضة في دورة السماعي الثقيل؟', '["٨","٦","١٢","١٠"]', 3, 'عشر نبضات، ميزان ١٠/٨.'),
      (9, 'كيف تُجمَّع نبضات الملفوف؟', '["٤ + ٤","٣ + ٣ + ٢","٢ + ٢ + ٢ + ٢","٣ + ٢ + ٢ + ٣"]', 1, 'الملفوف ٣ + ٣ + ٢.'),
      (10, 'بأيّ ميزان يُكتب المقسوم عادة؟', '["٤/٤","٣/٤","١٠/٨","٦/٨"]', 0, 'ثماني نبضات كروش = مقياس ٤/٤.'),
      (11, 'ما الفرق بين البلدي والمقسوم؟', '["البلدي أسرع دائمًا","في البلدي دُمّان في البداية بدل دُم وتَك","البلدي عشر نبضات","لا فرق بينهما"]', 1, 'البلدي مثل المقسوم، لكن التَك الأولى صارت دُم.'),
      (12, 'في المقسوم، على أيّ عدّ تقع الدُّمّان؟ [[iqa:maqsum]]', '["على ١ و٣","على ٢ و٤","على ١ و٢","على ٣ و٤"]', 0, 'الدُّمّان في بداية كل نصف: ١ و٣.')
    ) as t(position, prompt, options, answer, explanation)
  loop
    insert into public.exercise_questions (exercise_id, prompt, options, points, position)
    values (v_exercise, q.prompt, q.options::jsonb, 1, q.position)
    returning id into v_question;
    insert into public.exercise_answer_keys (question_id, correct_option, explanation)
    values (v_question, q.answer, q.explanation);
  end loop;
end $$;
