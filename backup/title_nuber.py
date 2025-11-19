# 1. 페이지 이동
        print("페이지로 이동 중...")
        page.goto("https://www.jobkorea.co.kr/Corp/GIMng/List?PubType=1&SrchStat=1") 

     
        # 2. 공고 리스트 컨테이너 로딩 대기
        # 보내주신 HTML의 전체를 감싸는 .rowWrap 클래스가 뜰 때까지 기다립니다.
        try:
            page.wait_for_selector(".rowWrap", timeout=10000)
        except:
            print("공고 리스트를 찾을 수 없습니다.")
            browser.close()
            return

        # 3. 모든 공고 항목(.giListItem) 가져오기
        job_items = page.locator(".giListItem").all()
        
        print(f"👉 총 {len(job_items)}개의 공고를 발견했습니다.\n")

        results = []

        for idx, item in enumerate(job_items, 1):
            try:
                # --- [공고명 추출] ---
                # .tit 클래스를 가진 요소의 텍스트 가져오기
                title_el = item.locator(".jobTitWrap a.tit")
                title = title_el.inner_text().strip() if title_el.count() > 0 else "제목 없음"

                # --- [공고번호 추출] ---
                # 방법 1: '공고번호' 텍스트 옆의 숫자 (화면에 보이는 것)
                id_text_el = item.locator(".date:has-text('공고번호') > span")
                
                if id_text_el.count() > 0:
                    job_id = id_text_el.inner_text().strip()
                else:
                    # 방법 2: 화면에 없다면 버튼의 data-gno 속성값 가져오기 (백업)
                    btn_el = item.locator("button[data-gno]").first
                    job_id = btn_el.get_attribute("data-gno") if btn_el.count() > 0 else "번호 없음"

                print(f"[{idx}] 공고명: {title}")
                print(f"     공고번호: {job_id}")
                
                results.append({"title": title, "id": job_id})

            except Exception as e:
                print(f"[{idx}] 추출 중 오류 발생: {e}")

        print("\n✅ 추출 완료!")
        browser.close()