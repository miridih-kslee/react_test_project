"use client";
import styled from "styled-components";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useEffect } from "react";
import axios from "axios";

// Mock API call
const fetchItems = async ({ pageParam = 0 }) => {
  const response = await axios.get(
    `https://jsonplaceholder.typicode.com/posts?_page=${
      pageParam + 1
    }&_limit=10`
  );
  return {
    items: response.data,
    nextPage: pageParam + 1,
  };
};

export default function Home() {
  const parentRef = useRef<HTMLDivElement>(null);

  // fetchNextPage를 받아서 밑에 useEffect에서 사용
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
    error,
  } = useInfiniteQuery({
    queryKey: ["posts"],
    queryFn: fetchItems,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });
  // useInfiniteQuery를 사용하는 이유는 cashing의 편리함, fetchNextPage도 무한 스크롤에서 사용하기 적합하게 이미 구현되어있음

  // flatMap을 사용하는 이유는 모든 페이지의 아이템을 하나의 배열로 만들기 위해서
  const allItems = data ? data.pages.flatMap((page) => page.items) : [];

  const virtualizer = useVirtualizer({
    count: hasNextPage ? allItems.length + 1 : allItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150,
    // 미리 5개 더 보는 overscan 여기있음
    overscan: 5,
  });

  useEffect(() => {
    // 마지막 원소 하나만을 가져오게 됨
    const [lastItem] = [...virtualizer.getVirtualItems()].reverse();

    if (!lastItem) {
      return;
    }

    // 마지막 원소의 index가 모든 아이템의 길이 - 1보다 크거나 같고, 다음 페이지가 있고, 다음 페이지를 로드하는 중이 아니라면 fetchNextPage를 호출
    // overscan으로 5개 먼저 보기 때문에 lastItem의 index는 실제로 보이는 것보다 5개 더 크게 됨
    if (
      lastItem.index >= allItems.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [
    hasNextPage,
    fetchNextPage,
    allItems.length,
    isFetchingNextPage,
    virtualizer.getVirtualItems(),
  ]);

  console.log(virtualizer.getVirtualItems());

  if (status === "pending") return <LoadingScreen>Loading...</LoadingScreen>;
  if (status === "error")
    return <ErrorScreen>Error: {error.message}</ErrorScreen>;

  return (
    <PageWrapper>
      <FeedContainer ref={parentRef}>
        <VirtualContent style={{ height: `${virtualizer.getTotalSize()}px` }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const isLoaderRow = virtualRow.index > allItems.length - 1;
            const item = allItems[virtualRow.index];

            return (
              <PostCard
                key={virtualRow.index}
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {isLoaderRow ? (
                  <LoaderItem>
                    {hasNextPage ? "Loading more..." : "No more posts"}
                  </LoaderItem>
                ) : (
                  <PostContent>
                    <PostTitle>{item.title}</PostTitle>
                    <PostBody>{item.body}</PostBody>
                  </PostContent>
                )}
              </PostCard>
            );
          })}
        </VirtualContent>
      </FeedContainer>
      {isFetching && !isFetchingNextPage && (
        <UpdateIndicator>Updating...</UpdateIndicator>
      )}
    </PageWrapper>
  );
}

const PageWrapper = styled.div`
  width: 100%;
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  box-sizing: border-box;
`;

const FeedContainer = styled.div`
  width: 100%;
  max-width: 800px;
  height: calc(100vh - 40px);
  overflow-y: auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
`;

const VirtualContent = styled.div`
  position: relative;
  width: 100%;
`;

const PostCard = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  padding: 16px;
  box-sizing: border-box;
`;

const PostContent = styled.div`
  background: white;
  border-bottom: 1px solid #eee;
  padding: 16px;
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-2px);
  }
`;

const PostTitle = styled.h2`
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #333;
  font-weight: 600;
`;

const PostBody = styled.p`
  margin: 0;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
`;

const LoaderItem = styled.div`
  width: 100%;
  padding: 20px;
  text-align: center;
  color: #999;
  font-size: 14px;
`;

const LoadingScreen = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #666;
`;

const ErrorScreen = styled(LoadingScreen)`
  color: #e74c3c;
`;

const UpdateIndicator = styled.div`
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
`;
