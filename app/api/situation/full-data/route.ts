import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching situation data from backend...');
    
    // Call the backend API
    const backendResponse = await fetch(`${BACKEND_URL}/api/situation/full-data`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!backendResponse.ok) {
      console.error(`Backend API error: ${backendResponse.status} ${backendResponse.statusText}`);
      throw new Error(`Backend API responded with status ${backendResponse.status}`);
    }

    const data = await backendResponse.json();
    console.log('Successfully fetched situation data:', Object.keys(data));

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in situation API route:', error);
    
    // Return mock data as fallback when backend is not available
    const mockData = {
      topology: {
        nodes: [
          {
            id: "company_1",
            name: "科技创新公司",
            type: "company",
            company_type: "centralized",
            status: "active",
            funds: 1000000,
            size: 10
          },
          {
            id: "company_2", 
            name: "敏捷科技",
            type: "company",
            company_type: "decentralized",
            status: "active",
            funds: 800000,
            size: 8
          },
          {
            id: "emp_1",
            name: "张总",
            type: "employee",
            role: "ceo",
            company_id: "company_1",
            status: "active"
          },
          {
            id: "emp_2",
            name: "李经理",
            type: "employee", 
            role: "manager",
            company_id: "company_1",
            status: "thinking"
          },
          {
            id: "emp_3",
            name: "王程序员",
            type: "employee",
            role: "employee", 
            company_id: "company_1",
            status: "deciding"
          },
          {
            id: "emp_4",
            name: "赵设计师",
            type: "employee",
            role: "employee",
            company_id: "company_1", 
            status: "idle"
          },
          {
            id: "emp_5",
            name: "刘产品",
            type: "employee",
            role: "employee",
            company_id: "company_2",
            status: "active"
          },
          {
            id: "emp_6", 
            name: "陈运营",
            type: "employee",
            role: "employee",
            company_id: "company_2",
            status: "thinking"
          },
          {
            id: "decision_1",
            name: "决策: 产品开发",
            type: "decision",
            description: "开发新功能模块",
            company_id: "company_1",
            employee_id: "emp_3"
          },
          {
            id: "decision_2",
            name: "决策: 市场推广", 
            type: "decision",
            description: "制定营销策略",
            company_id: "company_2",
            employee_id: "emp_5"
          }
        ],
        links: [
          {
            source: "company_1",
            target: "emp_1",
            type: "hierarchy",
            strength: 0.8,
            status: "active"
          },
          {
            source: "company_1",
            target: "emp_2", 
            type: "hierarchy",
            strength: 0.6,
            status: "active"
          },
          {
            source: "company_1",
            target: "emp_3",
            type: "hierarchy", 
            strength: 0.6,
            status: "active"
          },
          {
            source: "company_1",
            target: "emp_4",
            type: "hierarchy",
            strength: 0.6,
            status: "active"
          },
          {
            source: "emp_1",
            target: "emp_2",
            type: "hierarchy",
            strength: 0.9,
            status: "active"
          },
          {
            source: "emp_2",
            target: "emp_3",
            type: "hierarchy",
            strength: 0.7,
            status: "active"
          },
          {
            source: "emp_2", 
            target: "emp_4",
            type: "hierarchy",
            strength: 0.7,
            status: "active"
          },
          {
            source: "company_2",
            target: "emp_5",
            type: "hierarchy",
            strength: 0.6,
            status: "active"
          },
          {
            source: "company_2",
            target: "emp_6",
            type: "hierarchy",
            strength: 0.6, 
            status: "active"
          },
          {
            source: "emp_5",
            target: "emp_6",
            type: "collaboration",
            strength: 0.5,
            status: "active"
          },
          {
            source: "emp_3",
            target: "decision_1",
            type: "decision_flow",
            strength: 0.8,
            status: "active"
          },
          {
            source: "emp_5",
            target: "decision_2", 
            type: "decision_flow",
            strength: 0.8,
            status: "active"
          }
        ]
      },
      activities: [
        {
          id: "activity_1",
          type: "decision",
          company_id: "company_1",
          employee_id: "emp_3",
          content: "正在分析产品开发需求",
          timestamp: new Date().toISOString(),
          status: "active"
        },
        {
          id: "activity_2",
          type: "decision",
          company_id: "company_2", 
          employee_id: "emp_5",
          content: "评估市场推广方案",
          timestamp: new Date(Date.now() - 30000).toISOString(),
          status: "completed"
        }
      ],
      metadata: {
        last_updated: new Date().toISOString(),
        total_nodes: 12,
        total_links: 13,
        active_decisions: 2
      }
    };

    console.log('Using fallback mock data due to backend error');
    return NextResponse.json(mockData);
  }
}